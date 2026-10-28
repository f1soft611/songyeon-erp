package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonCommentSearchVO;
import egovframework.com.common.domain.repository.CommonCommentDAO;
import egovframework.com.common.controller.CommonCommentApiController;
import egovframework.com.common.service.impl.CommonCommentServiceImpl;
import egovframework.com.cmm.LoginVO;
import egovframework.let.common.dto.ListResult;
import egovframework.com.config.EgovConfigAppMapper;

class CommonCommentServiceTest {

    @Test
    void commonCommentApiRejectsApprovalOwnerForListAndCreate() {
        CommonCommentApiController controller = new CommonCommentApiController(null, null);
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setId("login-code");
        CommonCommentSearchVO search = new CommonCommentSearchVO();
        search.setOwnerType("APPROVAL");
        search.setOwnerId(10L);
        CommonCommentApiController.CommonCommentCreateRequest request =
            new CommonCommentApiController.CommonCommentCreateRequest();
        request.setOwnerType("APPROVAL");
        request.setOwnerId(10L);
        request.setContent("댓글");

        assertThatThrownBy(() -> controller.listComments(search, 3, null, null, user))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> controller.createComment(request, user))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void createCommentRejectsBlankContent() {
        CommonCommentService service = new CommonCommentServiceImpl(new CommonCommentDAO() {
            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return null;
            }
        });

        assertThatThrownBy(() -> service.createComment(1L, "APPROVAL", 10L, "   ", "user-001", "홍길동", null))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("댓글");
    }

    @Test
    void createCommentNormalizesOwnerAndWriter() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return 42L;
            }

            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO vo = new CommonCommentVO();
                vo.setCommentId(42L);
                vo.setTenantId(((Number) params.get("tenantId")).longValue());
                vo.setOwnerType("APPROVAL");
                vo.setOwnerId(10L);
                vo.setContent("테스트 댓글");
                vo.setWriterId("user-001");
                vo.setWriterName("홍길동");
                vo.setDeletedYn("N");
                return vo;
            }
        };

        CommonCommentServiceImpl service = new CommonCommentServiceImpl(stubDao);
        CommonCommentVO created = service.createComment(1L, "approval", 10L, "테스트 댓글", "user-001", "홍길동", null);

        assertThat(created.getTenantId()).isEqualTo(1L);
        assertThat(created.getOwnerType()).isEqualTo("APPROVAL");
        assertThat(created.getOwnerId()).isEqualTo(10L);
        assertThat(created.getContent()).isEqualTo("테스트 댓글");
        assertThat(created.getWriterId()).isEqualTo("user-001");
    }

    @Test
    void createCommentRejectsParentFromAnotherOwner() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO parent = comment(99L);
                parent.setTenantId(1L);
                parent.setOwnerType("NOTICE");
                parent.setOwnerId(11L);
                parent.setDeletedYn("N");
                return parent;
            }
        };

        CommonCommentService service = new CommonCommentServiceImpl(stubDao);

        assertThatThrownBy(() -> service.createComment(1L, "NOTICE", 10L, "답글", "user-001", "홍길동", 99L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("상위 댓글");
    }

    @Test
    void createCommentRejectsSystemCommentAsParent() {
        CommonCommentVO systemParent = comment(99L);
        systemParent.setTenantId(1L);
        systemParent.setOwnerType("APPROVAL");
        systemParent.setOwnerId(10L);
        systemParent.setCommentType("SYSTEM");
        systemParent.setDeletedYn("N");
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                if (((Number) params.get("commentId")).longValue() == 99L) {
                    return systemParent;
                }
                CommonCommentVO created = comment(100L);
                created.setTenantId(1L);
                created.setOwnerType("APPROVAL");
                created.setOwnerId(10L);
                created.setCommentType("USER");
                created.setDeletedYn("N");
                return created;
            }

            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return 100L;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .createComment(1L, "APPROVAL", 10L, "답글", "user-001", "홍길동", 99L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("시스템 댓글");
    }

    @Test
    void createCommentFailsClearlyWhenDaoIsUnavailable() {
        CommonCommentService service = new CommonCommentServiceImpl(null);

        assertThatThrownBy(() -> service.createComment(1L, "NOTICE", 10L, "댓글", "user-001", "홍길동", null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("DAO");
    }

    @Test
    void createCommentTrimsPersistedContent() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                assertThat(params.get("content")).isEqualTo("댓글");
                return 43L;
            }

            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO persisted = comment(43L);
                persisted.setContent("댓글");
                return persisted;
            }
        };

        CommonCommentVO created = new CommonCommentServiceImpl(stubDao)
            .createComment(1L, "NOTICE", 10L, "  댓글  ", "user-001", "홍길동", null);

        assertThat(created.getContent()).isEqualTo("댓글");
    }

    @Test
    void createCommentRejectsSelfParentWhenGeneratedIdMatchesParent() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO parent = comment(43L);
                parent.setTenantId(1L);
                parent.setOwnerType("NOTICE");
                parent.setOwnerId(10L);
                parent.setDeletedYn("N");
                return parent;
            }

            @Override
            public Long insertCommonComment(Map<String, Object> params) {
                return 43L;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .createComment(1L, "NOTICE", 10L, "답글", "user-001", "홍길동", 43L))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("자기 자신");
    }

    @Test
    void updateCommentRequiresActorOwnershipAndReturnsPersistedRow() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public int updateCommonComment(Map<String, Object> params) {
                assertThat(params.get("actorId")).isEqualTo("user-001");
                assertThat(params.get("actorName")).isEqualTo("홍길동");
                assertThat(params.get("content")).isEqualTo("수정 댓글");
                return 1;
            }

            @Override
            public CommonCommentVO selectCommonCommentById(Map<String, Object> params) {
                CommonCommentVO persisted = comment(7L);
                persisted.setContent("수정 댓글");
                persisted.setWriterId("user-001");
                return persisted;
            }
        };

        CommonCommentVO updated = new CommonCommentServiceImpl(stubDao)
            .updateComment(1L, 7L, "  수정 댓글  ", "user-001", "홍길동");

        assertThat(updated.getContent()).isEqualTo("수정 댓글");
        assertThat(updated.getWriterId()).isEqualTo("user-001");
    }

    @Test
    void updateCommentRejectsWhenNoOwnedRowWasUpdated() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public int updateCommonComment(Map<String, Object> params) {
                return 0;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .updateComment(1L, 7L, "수정 댓글", "other-user"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("찾을 수 없습니다");
    }

    @Test
    void deleteCommentRejectsWhenNoOwnedRowWasDeleted() {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public int softDeleteCommonComment(Map<String, Object> params) {
                assertThat(params.get("actorId")).isEqualTo("other-user");
                assertThat(params.get("actorName")).isEqualTo("다른 사용자");
                return 0;
            }
        };

        assertThatThrownBy(() -> new CommonCommentServiceImpl(stubDao)
            .deleteComment(1L, 7L, "other-user", "다른 사용자"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("찾을 수 없습니다");
    }

    @Test
    void listCommentsUsesInjectedDaoResult() throws Exception {
        CommonCommentVO existing = new CommonCommentVO();
        existing.setCommentId(7L);
        existing.setTenantId(1L);
        existing.setOwnerType("NOTICE");
        existing.setOwnerId(10L);
        existing.setContent("공지 댓글");
        existing.setWriterId("user-001");
        existing.setWriterName("홍길동");
        existing.setDeletedYn("N");

        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentList(Map<String, Object> params) {
                return Collections.singletonList(existing);
            }
        };

        CommonCommentServiceImpl service = new CommonCommentServiceImpl(stubDao);
        List<CommonCommentVO> comments = service.listComments(1L, "notice", 10L);

        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).getContent()).isEqualTo("공지 댓글");
    }

    @Test
    void listCommentsPageReturnsRecentCommentsAndCursorMetadata() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                assertThat(params.get("tenantId")).isEqualTo(1L);
                assertThat(params.get("ownerType")).isEqualTo("NOTICE");
                assertThat(params.get("beforeCommentId")).isEqualTo(20L);
                assertThat(params.get("limit")).isEqualTo(4);
                return Arrays.asList(comment(20L), comment(19L), comment(18L), comment(17L));
            }
        };

        CommonCommentPageVO page = new CommonCommentServiceImpl(stubDao)
            .listComments(1L, "notice", 10L, 3, 20L);

        assertThat(page.getComments()).extracting(CommonCommentVO::getCommentId)
            .containsExactly(18L, 19L, 20L);
        assertThat(page.isHasPrevious()).isTrue();
        assertThat(page.getNextBeforeCommentId()).isEqualTo(18L);
    }

    @Test
    void listCommentsSearchUsesCommonPaginationFieldsAndReturnsCount() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                assertThat(params.get("limit")).isEqualTo(4);
                return Arrays.asList(comment(20L));
            }

            @Override
            public Long countCommonComments(Map<String, Object> params) {
                return 6L;
            }
        };

        CommonCommentSearchVO search = new CommonCommentSearchVO();
        search.setTenantId(1L);
        search.setOwnerType("NOTICE");
        search.setOwnerId(10L);
        search.setPageIndex(2);
        search.setPageUnit(3);

        ListResult<CommonCommentVO> result = new CommonCommentServiceImpl(stubDao)
            .listComments(search);

        assertThat(result.getResultCnt()).isEqualTo(6L);
        assertThat(result.getResultList()).hasSize(1);
        assertThat(search.getFirstIndex()).isEqualTo(3);
    }

    @Test
    void listCommentsPageKeepsRepliesWithSelectedRootComments() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                assertThat(params.get("limit")).isEqualTo(2);
                return Arrays.asList(
                    comment(10L, null),
                    comment(11L, 10L),
                    comment(9L, null)
                );
            }
        };

        CommonCommentPageVO page = new CommonCommentServiceImpl(stubDao)
            .listComments(1L, "notice", 10L, 1, null);

        assertThat(page.getComments()).extracting(CommonCommentVO::getCommentId)
            .containsExactly(10L, 11L);
        assertThat(page.getComments().get(1).getParentCommentId()).isEqualTo(10L);
        assertThat(page.isHasPrevious()).isTrue();
        assertThat(page.getNextBeforeCommentId()).isEqualTo(10L);
    }

    @Test
    void listCommentsPageMarksDeletedParentsAsTombstones() throws Exception {
        CommonCommentVO deletedParent = comment(10L, null);
        deletedParent.setDeletedYn("Y");
        CommonCommentVO reply = comment(11L, 10L);
        reply.setDeletedYn("N");

        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPage(Map<String, Object> params) {
                return Arrays.asList(deletedParent, reply);
            }
        };

        CommonCommentPageVO page = new CommonCommentServiceImpl(stubDao)
            .listComments(1L, "NOTICE", 10L, 3, null);

        assertThat(page.getComments()).extracting(CommonCommentVO::getCommentId)
            .containsExactly(10L, 11L);
        assertThat(page.getComments().get(0).getContent()).isEqualTo("[삭제된 댓글입니다.]");
        assertThat(page.getComments().get(0).getWriterName()).isEqualTo("삭제된 댓글");
        assertThat(page.getComments().get(1).getParentCommentId()).isEqualTo(10L);
    }

    @Test
    void countCommentsUsesSeparateDaoCount() throws Exception {
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public Long countCommonComments(Map<String, Object> params) {
                assertThat(params.get("ownerType")).isEqualTo("NOTICE");
                return 11L;
            }
        };

        long count = new CommonCommentServiceImpl(stubDao).countComments(1L, "notice", 10L);

        assertThat(count).isEqualTo(11L);
    }

    @Test
    void listCommentPagesByOwnerIdsGroupsRootsAndBuildsPreviousPageMetadata() throws Exception {
        CommonCommentVO newestRoot = ownerComment(30L, null, 10L);
        CommonCommentVO newestReply = ownerComment(31L, 30L, 10L);
        CommonCommentVO secondRoot = ownerComment(20L, null, 10L);
        CommonCommentVO olderRoot = ownerComment(10L, null, 10L);
        CommonCommentVO otherOwnerRoot = ownerComment(8L, null, 20L);
        CommonCommentDAO stubDao = new CommonCommentDAO() {
            @Override
            public List<CommonCommentVO> selectCommonCommentPageByOwnerIds(Map<String, Object> params) {
                assertThat(params.get("tenantId")).isEqualTo(1L);
                assertThat(params.get("ownerType")).isEqualTo("NOTICE");
                List<?> ownerIds = (List<?>) params.get("ownerIds");
                assertThat(ownerIds).hasSize(2);
                assertThat(ownerIds.contains(10L)).isTrue();
                assertThat(ownerIds.contains(20L)).isTrue();
                assertThat(params.get("limit")).isEqualTo(3);
                return Arrays.asList(newestRoot, newestReply, secondRoot, olderRoot, otherOwnerRoot);
            }

            @Override
            public List<Map<String, Object>> selectCommonCommentCountsByOwnerIds(Map<String, Object> params) {
                Map<String, Object> firstOwnerCount = new HashMap<>();
                firstOwnerCount.put("ownerId", 10L);
                firstOwnerCount.put("totalCount", 4L);
                Map<String, Object> secondOwnerCount = new HashMap<>();
                secondOwnerCount.put("ownerId", 20L);
                secondOwnerCount.put("totalCount", 1L);
                return Arrays.asList(firstOwnerCount, secondOwnerCount);
            }
        };

        Map<Long, CommonCommentPageVO> pages = new CommonCommentServiceImpl(stubDao)
            .listCommentPagesByOwnerIds(1L, "notice", Arrays.asList(10L, 20L), 2);

        assertThat(pages.get(10L).getComments())
            .extracting(CommonCommentVO::getCommentId).containsExactly(20L, 30L, 31L);
        assertThat(pages.get(10L).isHasPrevious()).isTrue();
        assertThat(pages.get(10L).getNextBeforeCommentId()).isEqualTo(20L);
        assertThat(pages.get(10L).getResultCnt()).isEqualTo(4L);
        assertThat(pages.get(20L).getComments())
            .extracting(CommonCommentVO::getCommentId).containsExactly(8L);
        assertThat(pages.get(20L).isHasPrevious()).isFalse();
        assertThat(pages.get(20L).getNextBeforeCommentId()).isNull();
        assertThat(pages.get(20L).getResultCnt()).isEqualTo(1L);
    }

    @Test
    void listCommentPagesByOwnerIdsRejectsInvalidLimit() {
        CommonCommentService service = new CommonCommentServiceImpl(new CommonCommentDAO());

        assertThatThrownBy(() -> service.listCommentPagesByOwnerIds(1L, "NOTICE", Arrays.asList(10L), 0))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
        void commentMapperKeepsDeletedAncestorsInTheCommentTreeAndCountsOnlyActiveComments()
            throws IOException {
        String mapperXml;
        try (InputStream mapper = getClass().getClassLoader().getResourceAsStream(
                "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml")) {
            assertThat(mapper).isNotNull();
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = mapper.read(chunk)) != -1) {
                buffer.write(chunk, 0, read);
            }
            mapperXml = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        }

        int countStart = mapperXml.indexOf("<select id=\"countCommonComments\"");
        String countQuery = mapperXml.substring(countStart,
                mapperXml.indexOf("</select>", countStart));

        int pageStart = mapperXml.indexOf("<select id=\"selectCommonCommentPage\"");
        String pageQuery = mapperXml.substring(pageStart,
            mapperXml.indexOf("</select>", pageStart));
        int bulkCountStart = mapperXml.indexOf("<select id=\"selectCommonCommentCountsByOwnerIds\"");
        String bulkCountQuery = mapperXml.substring(bulkCountStart,
            mapperXml.indexOf("</select>", bulkCountStart));

        assertThat(pageQuery).contains("all_comment_tree");
        assertThat(pageQuery).contains("HAVING BOOL_OR(deleted_yn = 'N')");
        assertThat(pageQuery).contains("JOIN comment_tree tree ON tree.comment_id = child.parent_comment_id");
        assertThat(pageQuery).contains("root_comment_id");
        assertThat(bulkCountQuery).contains("parent_comment_id IS NULL");
        assertThat(bulkCountQuery).contains("deleted_yn = 'N'");
        assertThat(countQuery).contains("parent_comment_id IS NULL");
        assertThat(countQuery).contains("deleted_yn = 'N'");
        assertThat(countQuery).doesNotContain("WITH RECURSIVE root_page AS");
        assertThat(countQuery).contains("COUNT(*)");
        int insertStart = mapperXml.indexOf("<select id=\"insertCommonComment\"");
        String insertQuery = mapperXml.substring(insertStart,
            mapperXml.indexOf("</select>", insertStart));
        assertThat(insertQuery).contains("#{parentCommentId, jdbcType=BIGINT}");
        int updateStart = mapperXml.indexOf("<update id=\"updateCommonComment\"");
        String updateQuery = mapperXml.substring(updateStart,
            mapperXml.indexOf("</update>", updateStart));
        assertThat(updateQuery).contains("comment_type = 'USER'");
        int deleteStart = mapperXml.indexOf("<update id=\"softDeleteCommonComment\"");
        String deleteQuery = mapperXml.substring(deleteStart,
            mapperXml.indexOf("</update>", deleteStart));
        assertThat(deleteQuery).contains("comment_type = 'USER'");
        assertThat(mapperXml).contains("<result property=\"commentType\" column=\"comment_type\"/>");
        assertThat(mapperXml).contains("<result property=\"eventType\" column=\"event_type\"/>");
        assertThat(mapperXml).contains("<select id=\"insertSystemComment\"");
    }

    private static CommonCommentVO comment(Long commentId) {
        return comment(commentId, null);
    }

    private static CommonCommentVO comment(Long commentId, Long parentCommentId) {
        CommonCommentVO comment = new CommonCommentVO();
        comment.setCommentId(commentId);
        comment.setParentCommentId(parentCommentId);
        comment.setCommentType("USER");
        return comment;
    }

    private static CommonCommentVO ownerComment(Long commentId, Long parentCommentId, Long ownerId) {
        CommonCommentVO comment = comment(commentId, parentCommentId);
        comment.setOwnerId(ownerId);
        comment.setDeletedYn("N");
        return comment;
    }

    @Test
    void mapperFactoryRegistersSharedCommonSqlResources() throws Exception {
        EgovConfigAppMapper config = new EgovConfigAppMapper();
        Field dbTypeField = EgovConfigAppMapper.class.getDeclaredField("dbType");
        dbTypeField.setAccessible(true);
        dbTypeField.set(config, "postgresql");

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl("jdbc:postgresql://localhost:5432/postgres");
        dataSource.setUsername("postgres");
        dataSource.setPassword("postgres");

        Field dataSourceField = EgovConfigAppMapper.class.getDeclaredField("dataSource");
        dataSourceField.setAccessible(true);
        dataSourceField.set(config, dataSource);

        SqlSessionFactoryBean factoryBean = config.sqlSession();
        SqlSessionFactory factory = factoryBean.getObject();

        assertThat(factory.getConfiguration().getMappedStatementNames())
            .contains("CommonCommentDAO.insertCommonComment")
            .contains("CommonCommentDAO.selectCommonCommentList")
            .contains("CommonCommentDAO.selectCommonCommentPage")
            .contains("CommonCommentDAO.countCommonComments")
            .contains("CommonCommentDAO.selectCommonCommentPageByOwnerIds")
            .contains("CommonCommentDAO.selectApprovalUserCommentPagesByOwnerIds")
            .contains("CommonCommentDAO.selectApprovalUserCommentCountsByOwnerIds");
    }
}
