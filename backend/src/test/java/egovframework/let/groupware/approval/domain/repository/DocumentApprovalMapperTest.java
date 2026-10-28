package egovframework.let.groupware.approval.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.io.Resources;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.groupware.approval.domain.model.DocumentApprovalDetailVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalLineVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;

class DocumentApprovalMapperTest {

    @Test
    void ordinaryDocumentListsExposeCurrentActorOwnershipWithoutDrafterId() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("drafterId", "login-author");
        params.put("scope", "ALL");
        params.put("offset", 0);
        params.put("limit", 20);
        for (String statement : Arrays.asList("selectRelatedDocumentList", "selectRelatedDocumentWritePage")) {
            String sql = configuration.getMappedStatement("DocumentApprovalDAO." + statement)
                    .getBoundSql(params).getSql().replaceAll("\\s+", " ");
            assertThat(sql).contains("(m.drafter_id = ?) AS is_drafter");
        }
        assertThat(configuration.getResultMap("DocumentApprovalDAO.listItem").getResultMappings())
                .anySatisfy(mapping -> {
                    assertThat(mapping.getProperty()).isEqualTo("drafter");
                    assertThat(mapping.getColumn()).isEqualTo("is_drafter");
                });
        ObjectMapper mapper = new ObjectMapper();
        JsonNode json = mapper.readTree("{\"isDrafter\":true}");
        DocumentApprovalListItemVO item = mapper.treeToValue(json, DocumentApprovalListItemVO.class);
        assertThat(mapper.valueToTree(item).path("isDrafter").asBoolean()).isTrue();
        DocumentApprovalFeedItemVO feed = mapper.treeToValue(json, DocumentApprovalFeedItemVO.class);
        assertThat(feed.isDrafter()).isTrue();
        assertThat(mapper.valueToTree(feed).path("isDrafter").asBoolean()).isTrue();
    }

    @Test
    void filePagesUseRelatedDocumentAccessAndStableFileCursor() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("scope", "ALL");
        params.put("beforeFileId", 55L);
        String sql = configuration.getMappedStatement("DocumentApprovalDAO.selectRelatedFilePage")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(sql)
                .contains("m.tenant_id = ?", "m.deleted_yn = 'N'", "m.drafter_id = ?",
                        "m.document_status != 'DRAFT'", "l.participant_user_id = ?")
                .contains("f.owner_type = 'APPROVAL'", "f.owner_type = 'APPROVAL_COMMENT'",
                        "c.owner_type = 'APPROVAL'", "c.deleted_yn = 'N'",
                        "f.deleted_yn = 'N'", "f.file_usage_type = 'ATTACHMENT'")
                .contains("(f.created_at, f.file_id) <", "ORDER BY f.created_at DESC, f.file_id DESC",
                        "LIMIT 21");
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectRelatedFileCursor")).isTrue();
    }

    @Test
    void writeDocumentPagesIncludePinsInPageAndCountWithStableOffsetOrdering() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectRelatedDocumentWritePage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.countRelatedWriteDocuments")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("userId", 101L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("scope", "MY_PENDING");
        params.put("documentType", "DRAFTING");
        params.put("electronicApprovalId", 77L);
        params.put("offset", 20);
        params.put("limit", 20);

        String pageSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentWritePage")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        String countSql = configuration
                .getMappedStatement("DocumentApprovalDAO.countRelatedWriteDocuments")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        for (String sql : Arrays.asList(pageSql, countSql)) {
            assertThat(sql)
                    .contains("m.tenant_id = ?", "m.deleted_yn = 'N'", "m.drafter_id = ?",
                            "l.participant_user_id = ?", "m.document_type = ?",
                            "m.electronic_approval_id = ?")
                    .doesNotContain("tb_electronic_approval_pin", "p.user_id");
        }
        assertThat(pageSql)
                .contains("ORDER BY m.updated_at DESC, m.electronic_approval_id DESC")
                .contains("LIMIT ? OFFSET ?");
    }

    @Test
    void personalPinsAreScopedToCurrentUserAndReadableDocuments() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.insertDocumentApprovalPin")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.deleteDocumentApprovalPin")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectPinnedRelatedDocumentList")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("userId", 101L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("electronicApprovalId", 77L);
        params.put("documentType", "GENERAL");
        params.put("scope", "MY_PENDING");

        String selectSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectPinnedRelatedDocumentList")
                .getBoundSql(params)
                .getSql()
                .replaceAll("\\s+", " ");
        assertThat(selectSql)
                .contains("p.tenant_id = ?", "p.user_id = ?")
                .contains("m.tenant_id = ?", "m.deleted_yn = 'N'")
                .contains("m.drafter_id = ?", "l.participant_user_id = ?")
                .contains("pending_line.action_status = 'PENDING'")
                .contains("m.document_type = ?", "m.electronic_approval_id = ?")
                .contains("ORDER BY m.updated_at DESC, m.electronic_approval_id DESC");

        String insertSql = configuration
                .getMappedStatement("DocumentApprovalDAO.insertDocumentApprovalPin")
                .getBoundSql(params)
                .getSql()
                .replaceAll("\\s+", " ");
        assertThat(insertSql)
                .contains("tenant_id", "user_id", "electronic_approval_id")
                .contains("m.tenant_id = ?", "m.electronic_approval_id = ?", "m.deleted_yn = 'N'")
                .contains("m.drafter_id = ?", "l.participant_user_id = ?")
                .contains("ON CONFLICT (tenant_id, user_id, electronic_approval_id) DO NOTHING");

        String deleteSql = configuration
                .getMappedStatement("DocumentApprovalDAO.deleteDocumentApprovalPin")
                .getBoundSql(params)
                .getSql()
                .replaceAll("\\s+", " ");
        assertThat(deleteSql)
                .contains("tenant_id = ?", "user_id = ?", "electronic_approval_id = ?")
                .contains("EXISTS ( SELECT 1 FROM public.tb_electronic_approval_main m")
                .contains("m.tenant_id = p.tenant_id", "m.deleted_yn = 'N'")
                .contains("m.drafter_id = ?", "l.participant_user_id = ?");
    }

    @Test
    void statusPageFiltersByDocumentIdAndCurrentUsersApprovalState() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("electronicApprovalIdFilter", 77L);
        params.put("myParticipantType", "APPROVAL");
        params.put("myActionStatus", "PENDING");
        params.put("currentApproverName", "Sam");
        params.put("scope", "ALL");
        params.put("sortField", "electronicApprovalId");
        params.put("sortDirection", "ASC");
        params.put("offset", 0);
        params.put("limit", 50);

        for (String statementId : Arrays.asList("selectRelatedDocumentPage", "countRelatedDocuments")) {
            BoundSql boundSql = configuration.getMappedStatement("DocumentApprovalDAO." + statementId)
                    .getBoundSql(params);
            String sql = boundSql.getSql().replaceAll("\\s+", " ");
            assertThat(sql)
                    .contains("m.electronic_approval_id = ?")
                    .contains("my_line.participant_user_id = ?")
                    .contains("my_line.participant_type = ?")
                    .contains("my_line.action_status = ?")
                    .contains("pending_line.participant_name ILIKE '%' || ? || '%'")
                    .contains("pending_line.stage_order = (")
                    .contains("m.tenant_id = ?");
            assertThat(boundSql.getParameterMappings())
                    .extracting(ParameterMapping::getProperty)
                    .contains("electronicApprovalIdFilter", "participantUserId", "myParticipantType",
                            "myActionStatus", "currentApproverName");
        }

        String pageSql = configuration.getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(pageSql)
                .contains("AS my_participant_type")
                .contains("AS my_action_status")
                .contains("AS current_approval_step");
    }

    @Test
    void statusPageShowsDrafterRoleAndFiltersOwnDraftsByCreationDate() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("scope", "ALL");
        params.put("myParticipantType", "DRAFTER");
        params.put("submittedAtFrom", "2026-10-01");
        params.put("submittedAtTo", "2026-10-20");
        params.put("offset", 0);
        params.put("limit", 50);

        String pageSql = configuration.getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        String countSql = configuration.getMappedStatement("DocumentApprovalDAO.countRelatedDocuments")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");

        for (String sql : Arrays.asList(pageSql, countSql)) {
            assertThat(sql)
                    .contains("m.drafter_id = ?")
                    .contains("m.document_status = 'DRAFT' AND m.created_at >= CAST(? AS date)")
                    .contains("m.document_status = 'DRAFT' AND m.created_at < CAST(? AS date) + INTERVAL '1 day'")
                    .contains("m.submitted_at >= CAST(? AS date)")
                    .contains("m.submitted_at < CAST(? AS date) + INTERVAL '1 day'")
                    .doesNotContain("my_line.participant_type = ?");
        }
        assertThat(pageSql)
                .contains("CASE WHEN m.drafter_id = ? THEN 'DRAFTER'")
                .contains("AS my_participant_type");
    }

    @Test
    void documentReadsAllowOwnDraftsButRequireNonDraftStatusForOtherParticipants() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("electronicApprovalId", 77L);
        params.put("ownerIds", Arrays.asList(77L, 78L));
        String[] statementIds = {
            "selectRelatedDocumentList",
            "selectRelatedDocumentPage",
            "countRelatedDocuments",
            "selectDocumentApprovalSummary",
            "selectApprovalNotices",
            "selectDocumentApprovalDetail",
            "selectDocumentApprovalDetailsByIds",
            "selectIsDocumentParticipant"
        };
        String accessPredicate = "AND ( m.drafter_id = ? OR ( m.document_status != 'DRAFT' AND EXISTS ( "
                + "SELECT 1 FROM public.tb_electronic_approval_line_info l "
                + "WHERE l.tenant_id = m.tenant_id "
                + "AND l.electronic_approval_id = m.electronic_approval_id "
                + "AND l.participant_user_id = ? ) ) )";

        for (String scope : Arrays.asList("ALL", "MY_PENDING", "IN_PROGRESS", "DRAFT",
                "COMPLETED", "REVISION_REQUESTED", "REJECTED")) {
            params.put("scope", scope);
            for (String statementId : statementIds) {
                BoundSql boundSql = configuration.getMappedStatement("DocumentApprovalDAO." + statementId)
                        .getBoundSql(params);
                assertThat(boundSql.getSql().replaceAll("\\s+", " "))
                        .as("%s with scope %s keeps own drafts and excludes other users' drafts", statementId, scope)
                        .contains("m.tenant_id = ?")
                        .contains("m.deleted_yn = 'N'")
                        .contains(accessPredicate);
                assertThat(boundSql.getParameterMappings())
                        .extracting(ParameterMapping::getProperty)
                        .contains("tenantId", "drafterId", "participantUserId");
            }
        }
    }

    @Test
    void detailSerializesTheDrafterFlagUsingTheApiPropertyName() throws Exception {
        DocumentApprovalDetailVO detail = new DocumentApprovalDetailVO();
        detail.setDrafter(true);
        detail.setViewCount(7);

        JsonNode json = new ObjectMapper().readTree(new ObjectMapper().writeValueAsString(detail));

        assertThat(json.path("isDrafter").asBoolean()).isTrue();
        assertThat(json.path("viewCount").asInt()).isEqualTo(7);
        assertThat(json.has("drafter")).isFalse();
    }

    @Test
    void nullableDraftingCategoryUsesBigIntForCreateAndUpdate() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("draftingWorkCategoryId", null);
        BoundSql insertSql = configuration
                .getMappedStatement("DocumentApprovalDAO.insertDocumentApprovalMain")
                .getBoundSql(params);
        BoundSql updateSql = configuration
                .getMappedStatement("DocumentApprovalDAO.updateDocumentApprovalMain")
                .getBoundSql(params);

        assertDraftingCategoryJdbcType(insertSql);
        assertDraftingCategoryJdbcType(updateSql);
    }

    @Test
    void draftWritesDocumentNumberAndCanUpdateRevisionRequestedDocuments() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("eabusNo", "001");
        params.put("documentStatus", "DRAFT");
        BoundSql insertBoundSql = configuration
                .getMappedStatement("DocumentApprovalDAO.insertDocumentApprovalMain")
                .getBoundSql(params);
        BoundSql updateBoundSql = configuration
                .getMappedStatement("DocumentApprovalDAO.updateDocumentApprovalMain")
                .getBoundSql(params);
        String ownerSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDraftDrafterId")
                .getBoundSql(params).getSql();

        assertThat(insertBoundSql.getSql()).contains("eabus_no");
        assertThat(updateBoundSql.getSql())
                .contains("eabus_no = ?")
                .contains("document_status IN ('DRAFT', 'REVISION_REQUESTED')");
        assertThat(insertBoundSql.getParameterMappings())
                .extracting(ParameterMapping::getProperty)
                .contains("eabusNo");
        assertThat(updateBoundSql.getParameterMappings())
                .extracting(ParameterMapping::getProperty)
                .contains("eabusNo");
        assertThat(ownerSql).contains("document_status IN ('DRAFT', 'REVISION_REQUESTED')");
    }

    @Test
    void approvalAndCommonMappersParseAndKeepGenericFileAccessOutsideApproval() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/com/common/CommonFile_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.insertDocumentApprovalMain")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.insertDocumentApprovalLine")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.insertSystemComment")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("fileId", 77L);
        String downloadSql = configuration
                .getMappedStatement("CommonFileDAO.selectCommonFileByIdExcludingApproval")
                .getBoundSql(params).getSql();
        String deleteSql = configuration
                .getMappedStatement("CommonFileDAO.softDeleteCommonFileExcludingApproval")
                .getBoundSql(params).getSql();
        assertThat(downloadSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
        assertThat(deleteSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
    }

    @Test
    void approvalWorkflowAndSystemTimelineStatementsAreMapped() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalForUpdate")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectCanDeletePendingDocumentApproval")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.softDeleteDocumentApproval")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.updateDocumentApprovalStatus")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectCurrentPendingApprovalLine")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.updateApprovalLineAction")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectPendingApprovalCountForStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectNextWaitingApprovalStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.activateApprovalStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectRelatedDocumentList")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalSummary")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalDetail")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDocumentApprovalDetailsByIds")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectApprovalLines")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectApprovalLinesByOwnerIds")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectDraftDocumentStatus")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalSystemEvents")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalUserCommentPagesByOwnerIds")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalUserCommentCountsByOwnerIds")).isTrue();

        String draftResponseSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDraftDocumentStatus")
                .getBoundSql(new HashMap<String, Object>())
                .getSql();
        assertThat(draftResponseSql)
                .contains("eabus_no")
                .contains("document_status")
                .contains("submitted_at")
                .contains("drafter_id = ?");
        String detailSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDocumentApprovalDetail")
                .getBoundSql(new HashMap<String, Object>())
                .getSql();
        assertThat(detailSql).contains("drafting_work_category_id");
        assertThat(detailSql)
                .contains("m.deleted_yn = 'N'")
                .contains("(m.drafter_id = ?) AS is_drafter");
        String deletionSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectCanDeletePendingDocumentApproval")
                .getBoundSql(new HashMap<String, Object>())
                .getSql();
        assertThat(deletionSql)
                .contains("drafter_line.action_status = 'APPROVED'")
                .contains("line.action_status NOT IN ('WAITING', 'PENDING')");
    }

    @Test
    void feedBatchQueriesKeepTenantAuthorizationAndRootCommentSemantics() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("ownerIds", Arrays.asList(77L, 78L));
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("limit", 4);

        BoundSql detailBoundSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDocumentApprovalDetailsByIds")
                .getBoundSql(params);
        String detailSql = detailBoundSql.getSql();
        String linesSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectApprovalLinesByOwnerIds")
                .getBoundSql(params).getSql();
        String commentPageSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalUserCommentPagesByOwnerIds")
                .getBoundSql(params).getSql();
        String commentCountSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalUserCommentCountsByOwnerIds")
                .getBoundSql(params).getSql();

        assertThat(detailSql)
                .contains("m.tenant_id = ?")
                .contains("m.electronic_approval_id IN")
                .contains("m.deleted_yn = 'N'")
                .contains("m.drafter_id = ?")
                .contains("l.participant_user_id = ?");
        assertThat(detailBoundSql.getParameterMappings()).hasSize(6);
        assertThat(linesSql)
                .contains("line.tenant_id = ?")
                .contains("line.electronic_approval_id IN")
                .contains("ORDER BY line.electronic_approval_id, line.stage_order, line.participant_order");
        assertThat(commentPageSql)
                .contains("tenant_id = ?")
                .contains("owner_type = 'APPROVAL'")
                .contains("comment_type = 'USER'")
                .contains("PARTITION BY owner_id")
                .contains("root_order <= ?");
        assertThat(commentCountSql)
                .contains("tenant_id = ?")
                .contains("owner_type = 'APPROVAL'")
                .contains("comment_type = 'USER'")
                .contains("parent_comment_id IS NULL")
                .contains("deleted_yn = 'N'");
    }

    @Test
    void cancellationStatementsAreMapped() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration,
                "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.resetSubmittedDocumentToDraft")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.resetSubmittedApprovalLines")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectUserApprovedApprovalLineForUpdate")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectProcessedLaterApprovalStage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.resetApprovalLineToPending")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.resetUntouchedLaterApprovalStages")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.countProcessedApprovalLines")).isTrue();
    }

    @Test
    void cancellationSqlEnforcesTenantOwnershipAndWorkflowBoundaries() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration,
                "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("electronicApprovalId", 77L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "202");
        params.put("electronicApprovalLineId", 22L);
        params.put("stageOrder", 2);

        String resetDocumentSql = configuration
                .getMappedStatement("DocumentApprovalDAO.resetSubmittedDocumentToDraft")
                .getBoundSql(params).getSql();
        String resetLinesSql = configuration
                .getMappedStatement("DocumentApprovalDAO.resetSubmittedApprovalLines")
                .getBoundSql(params).getSql();
        String approvedLineSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectUserApprovedApprovalLineForUpdate")
                .getBoundSql(params).getSql();
        String laterStageSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectProcessedLaterApprovalStage")
                .getBoundSql(params).getSql();
        String resetActorSql = configuration
                .getMappedStatement("DocumentApprovalDAO.resetApprovalLineToPending")
                .getBoundSql(params).getSql();
        String resetLaterSql = configuration
                .getMappedStatement("DocumentApprovalDAO.resetUntouchedLaterApprovalStages")
                .getBoundSql(params).getSql();
        String processedCountSql = configuration
                .getMappedStatement("DocumentApprovalDAO.countProcessedApprovalLines")
                .getBoundSql(params).getSql();

        assertThat(resetDocumentSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("drafter_id = ?")
                .contains("document_status = 'PENDING'")
                .contains("submitted_at = NULL");
        assertThat(resetLinesSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("participant_type IN ('APPROVAL', 'AGREEMENT')")
                .contains("action_comment = NULL");
        assertThat(approvedLineSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("participant_user_id = ?")
                .contains("stage_order > 1")
                .contains("action_status = 'APPROVED'")
                .contains("FOR UPDATE");
        assertThat(laterStageSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("stage_order > ?")
                .contains("participant_type IN ('APPROVAL', 'AGREEMENT')")
                .contains("action_status IN ('APPROVED', 'REJECTED', 'RETURNED')");
        assertThat(resetActorSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_line_id = ?")
                .contains("participant_user_id = ?")
                .contains("action_status = 'APPROVED'")
                .contains("action_comment = NULL");
        assertThat(resetLaterSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("stage_order > ?")
                .contains("action_status = 'PENDING'")
                .contains("pending_at = NULL");
        assertThat(processedCountSql)
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("stage_order > 1")
                .contains("participant_type IN ('APPROVAL', 'AGREEMENT')")
                .contains("action_status IN ('APPROVED', 'REJECTED', 'RETURNED')");
    }

    @Test
    void approvalCommentStreamQueriesPageMixedRootsAndCountVisibleThreads() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalCommentStreamPagesByOwnerIds"))
                .isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalUserCommentThreadsByRootIds"))
                .isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalCommentStreamCountsByOwnerIds"))
                .isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalCommentStreamCursor"))
                .isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("ownerIds", Arrays.asList(77L, 78L));
        params.put("rootIds", Arrays.asList(103L, 104L));
        params.put("limit", 4);
        params.put("beforeCommentId", null);

        org.apache.ibatis.mapping.BoundSql initialPageBoundSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalCommentStreamPagesByOwnerIds")
                .getBoundSql(params);
        String pageSql = initialPageBoundSql.getSql();
        String threadSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalUserCommentThreadsByRootIds")
                .getBoundSql(params)
                .getSql();
        String countSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalCommentStreamCountsByOwnerIds")
                .getBoundSql(params)
                .getSql();
        String cursorSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalCommentStreamCursor")
                .getBoundSql(params)
                .getSql();

        params.put("beforeCommentId", 103L);
        org.apache.ibatis.mapping.BoundSql olderPageBoundSql = configuration
                .getMappedStatement("CommonCommentDAO.selectApprovalCommentStreamPagesByOwnerIds")
                .getBoundSql(params);
        String olderPageSql = olderPageBoundSql.getSql();

        assertThat(pageSql)
                .contains("comment_type = 'USER'")
                .contains("comment_type = 'SYSTEM'")
                .contains("PARTITION BY owner_id")
                .contains("created_at DESC, comment_id DESC")
                .doesNotContain("cursor_item");
        assertThat(initialPageBoundSql.getParameterMappings())
                .extracting(org.apache.ibatis.mapping.ParameterMapping::getProperty)
                .doesNotContain("beforeCommentId");
        assertThat(threadSql)
                .contains("parent_comment_id")
                .contains("comment_type = 'USER'")
                .contains("tenant_id = ?");
        assertThat(countSql)
                .contains("BOOL_OR(deleted_yn = 'N')")
                .contains("comment_type = 'SYSTEM'")
                .contains("comment_type = 'USER'")
                .contains("owner_id AS \"ownerId\"")
                .contains("COUNT(*) AS \"totalCount\"");
        assertThat(cursorSql)
                .contains("tenant_id = ?")
                .contains("owner_id = ?")
                .contains("comment_id = ?");
        assertThat(olderPageSql)
                .contains("JOIN cursor_item cursor")
                .contains("(root.created_at, root.comment_id) < (cursor.created_at, cursor.comment_id)");
        assertThat(olderPageBoundSql.getParameterMappings())
                .extracting(org.apache.ibatis.mapping.ParameterMapping::getProperty)
                .contains("beforeCommentId");
    }

    @Test
    void detailViewCountAndViewerHistoryStatementsAreMappedWithTenantGuards() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.getResultMap("DocumentApprovalDAO.detail").getResultMappings())
                .extracting(mapping -> mapping.getProperty())
                .contains("viewCount");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("loginCode", "login-author");
        params.put("electronicApprovalId", 77L);
        params.put("loginId", 201L);

        String detailSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectDocumentApprovalDetail")
                .getBoundSql(params)
                .getSql();
        String loginSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectLoginIdByLoginCode")
                .getBoundSql(params)
                .getSql();
        String historySql = configuration
                .getMappedStatement("DocumentApprovalDAO.insertElectronicApprovalViewHistory")
                .getBoundSql(params)
                .getSql();
        String counterSql = configuration
                .getMappedStatement("DocumentApprovalDAO.incrementElectronicApprovalViewCount")
                .getBoundSql(params)
                .getSql();

        assertThat(detailSql).contains("m.view_count");
        assertThat(loginSql)
                .contains("tenant_id = ?")
                .contains("login_code = ?")
                .contains("use_at = 'Y'");
        assertThat(historySql)
                .contains("ON CONFLICT (tenant_id, electronic_approval_id, login_id) DO NOTHING")
                .contains("RETURNING view_history_id");
        assertThat(counterSql)
                .contains("view_count = view_count + 1")
                .contains("tenant_id = ?")
                .contains("electronic_approval_id = ?")
                .contains("deleted_yn = 'N'");
    }

    @Test
    void approvalLineImagePropertiesUseTenantScopedLeftJoinsAndProcessedApprovalStamps() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration,
                "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.getResultMap("DocumentApprovalDAO.approvalLine").getResultMappings())
                .extracting(mapping -> mapping.getProperty())
                .contains("participantProfileImage", "participantStampImage");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("electronicApprovalId", 77L);
        String approvalLinesSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectApprovalLines")
                .getBoundSql(params)
                .getSql();
        assertThat(approvalLinesSql)
                .contains("LEFT JOIN public.tb_user u")
                .contains("u.tenant_id = line.tenant_id")
                .contains("CAST(u.user_id AS varchar) = line.participant_user_id")
                .contains("LEFT JOIN public.tb_login_account la")
                .contains("la.tenant_id = u.tenant_id")
                .contains("la.login_id = u.login_id")
                .contains("la.profile_image")
                .contains("line.action_status IN ('APPROVED', 'REJECTED', 'RETURNED')")
                .contains("ORDER BY line.stage_order, line.participant_order");

        JsonNode lineJson = new ObjectMapper().valueToTree(new DocumentApprovalLineVO());
        assertThat(lineJson.has("participantProfileImage")).isTrue();
        assertThat(lineJson.has("participantStampImage")).isTrue();
    }

    @Test
    void approvalDetailProfileImageUsesTenantAndDrafterLoginCode() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration,
                "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.getResultMap("DocumentApprovalDAO.detail").getResultMappings())
                .extracting(mapping -> mapping.getProperty())
                .contains("drafterProfileImage");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("electronicApprovalId", 77L);
        params.put("ownerIds", java.util.Collections.singletonList(77L));
        params.put("drafterId", "login-author");
        for (String statement : new String[] {
                "selectDocumentApprovalDetail", "selectDocumentApprovalDetailsByIds"
        }) {
            String query = configuration.getMappedStatement("DocumentApprovalDAO." + statement)
                    .getBoundSql(params).getSql();
            assertThat(query).as(statement)
                    .contains("la.profile_image AS drafter_profile_image")
                    .contains("LEFT JOIN public.tb_login_account la")
                    .contains("la.tenant_id = m.tenant_id")
                    .contains("la.login_code = m.drafter_id");
        }
    }

    @Test
    void approvalUserCommentPageAndCountStatementsAreMapped() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("CommonCommentDAO.selectApprovalUserCommentPage")).isTrue();
        assertThat(configuration.hasStatement("CommonCommentDAO.countApprovalUserComments")).isTrue();
    }

    @Test
    void commentAndSystemEventReadsReturnTenantScopedProfileImages() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");

        assertThat(configuration.getResultMap("CommonCommentDAO.commonCommentMap").getResultMappings())
                .extracting(mapping -> mapping.getProperty())
                .contains("writerProfileImage");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("ownerType", "NOTICE");
        params.put("ownerId", 77L);
        params.put("ownerIds", java.util.Collections.singletonList(77L));
        params.put("rootIds", java.util.Collections.singletonList(55L));
        params.put("commentId", 55L);
        params.put("beforeCommentId", null);
        params.put("limit", 3);
        for (String statement : new String[] {
                "selectCommonCommentList",
                "selectCommonCommentPageByOwnerIds",
                "selectCommonCommentPage",
                "selectApprovalUserCommentPage",
                "selectApprovalUserCommentPagesByOwnerIds",
                "selectApprovalCommentStreamPagesByOwnerIds",
                "selectApprovalUserCommentThreadsByRootIds",
                "selectApprovalCommentStreamCursor",
                "selectApprovalUserCommentById",
                "selectCommonCommentById",
                "selectApprovalSystemEvents",
                "selectApprovalSystemEventsByOwnerIds"
        }) {
            String query = configuration.getMappedStatement("CommonCommentDAO." + statement)
                    .getBoundSql(params).getSql();
            String commentAlias = statement.equals("selectApprovalCommentStreamCursor") ? "cursor" : "c";
            assertThat(query).as(statement)
                    .contains("writer_profile_image")
                    .contains("LEFT JOIN public.tb_login_account la")
                    .contains("la.tenant_id = " + commentAlias + ".tenant_id")
                    .contains("la.login_code = " + commentAlias + ".writer_id")
                    .contains("WHEN " + commentAlias + ".deleted_yn = 'N'")
                    .doesNotContain("WHEN " + commentAlias + ".comment_type = 'USER'");
        }
    }

    @Test
    void softDeletedDocumentsAreExcludedFromApprovalReadsAndDraftWrites() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("scope", "ALL");
        String[] statementIds = {
            "selectDocumentApprovalForUpdate",
            "updateDocumentApprovalStatus",
            "updateDocumentApprovalMain",
            "selectDraftDrafterId",
            "selectDraftDocumentStatus",
            "selectRelatedDocumentList",
            "selectDocumentApprovalSummary",
            "selectApprovalNotices",
            "selectDocumentApprovalDetail",
            "selectIsDocumentParticipant"
        };
        for (String statementId : statementIds) {
            String sql = configuration
                    .getMappedStatement("DocumentApprovalDAO." + statementId)
                    .getBoundSql(params)
                    .getSql();
            assertThat(sql)
                    .as("%s excludes soft-deleted documents", statementId)
                    .contains("deleted_yn = 'N'");
        }
    }

    @Test
    void documentStatusPageUsesActorScopedBoundFiltersAndMatchingCount() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml");

        assertThat(configuration.hasStatement("DocumentApprovalDAO.selectRelatedDocumentPage")).isTrue();
        assertThat(configuration.hasStatement("DocumentApprovalDAO.countRelatedDocuments")).isTrue();

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("drafterId", "login-author");
        params.put("participantUserId", "101");
        params.put("documentType", "GENERAL");
        params.put("documentStatus", "COMPLETED");
        params.put("keyword", "annual");
        params.put("eabusNoFilter", "001");
        params.put("titleFilter", "budget");
        params.put("drafterNameFilter", "Alex");
        params.put("drafterDepartmentName", "Finance");
        params.put("participantName", "Sam");
        params.put("submittedAtFrom", "2026-09-16");
        params.put("submittedAtTo", "2026-10-16");
        params.put("updatedAtFrom", "2026-10-01");
        params.put("updatedAtTo", "2026-10-16");
        params.put("offset", 0);
        params.put("limit", 200);
        params.put("sortField", "submittedAt");
        params.put("sortDirection", "DESC");

        BoundSql pageSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
                .getBoundSql(params);
        BoundSql countSql = configuration
                .getMappedStatement("DocumentApprovalDAO.countRelatedDocuments")
                .getBoundSql(params);
        String normalizedPageSql = pageSql.getSql().replaceAll("\\s+", " ");
        String normalizedCountSql = countSql.getSql().replaceAll("\\s+", " ");

        assertThat(normalizedPageSql)
                .contains("m.tenant_id = ?")
                .contains("m.drafter_id = ?")
                .contains("l.participant_user_id = ?")
                .contains("m.eabus_no ILIKE")
                .contains("m.title ILIKE")
                .contains("m.eabus_no ILIKE '%' || ? || '%'")
                .contains("m.title ILIKE '%' || ? || '%'")
                .contains("m.drafter_name ILIKE")
                .contains("m.drafter_department_name ILIKE")
                .contains("participant_line.participant_name ILIKE")
                .contains("m.submitted_at >= CAST(? AS date)")
                .contains("m.submitted_at < CAST(? AS date) + INTERVAL '1 day'")
                .contains("m.updated_at >= CAST(? AS date)")
                .contains("m.updated_at < CAST(? AS date) + INTERVAL '1 day'")
                .contains("ORDER BY m.submitted_at DESC")
                .contains("LIMIT ? OFFSET ?");
        assertThat(normalizedCountSql)
                .contains("m.tenant_id = ?")
                .contains("m.drafter_id = ?")
                .contains("l.participant_user_id = ?")
                .contains("m.eabus_no ILIKE")
                .contains("m.submitted_at >= CAST(? AS date)")
                .contains("m.updated_at < CAST(? AS date) + INTERVAL '1 day'");
        assertThat(pageSql.getParameterMappings())
                .extracting(ParameterMapping::getProperty)
                .contains("tenantId", "drafterId", "participantUserId", "keyword",
                        "eabusNoFilter", "titleFilter",
                        "documentType", "documentStatus", "drafterNameFilter",
                        "drafterDepartmentName", "participantName",
                        "submittedAtFrom", "submittedAtTo",
                        "updatedAtFrom", "updatedAtTo", "limit", "offset");

        Map<String, Object> allRowsParams = new HashMap<>(params);
        allRowsParams.remove("limit");
        allRowsParams.remove("offset");
        String allRowsSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
                .getBoundSql(allRowsParams).getSql().replaceAll("\\s+", " ");
        assertThat(allRowsSql).contains("ORDER BY m.submitted_at DESC")
                .doesNotContain("LIMIT", "OFFSET");

        params.put("sortField", "participantName");
        String participantSortSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(participantSortSql).contains("ORDER BY participant_name DESC");

        params.put("sortField", "approvalProgress");
        String progressSortSql = configuration
                .getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
                .getBoundSql(params).getSql().replaceAll("\\s+", " ");
        assertThat(progressSortSql).contains("ORDER BY approval_progress DESC");
    }

    @Test
    void genericCommentMutationAndFileIdAccessExcludeApprovalOwnedRecords() throws Exception {
        Configuration configuration = new Configuration();
        parseMapper(configuration, "egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml");
        parseMapper(configuration, "egovframework/mapper/com/common/CommonFile_SQL_postgresql.xml");

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("commentId", 12L);
        params.put("fileId", 77L);

        String updateCommentSql = configuration
                .getMappedStatement("CommonCommentDAO.updateCommonComment")
                .getBoundSql(params).getSql();
        String deleteCommentSql = configuration
                .getMappedStatement("CommonCommentDAO.softDeleteCommonComment")
                .getBoundSql(params).getSql();
        String downloadFileSql = configuration
                .getMappedStatement("CommonFileDAO.selectCommonFileByIdExcludingApproval")
                .getBoundSql(params).getSql();
        String deleteFileSql = configuration
                .getMappedStatement("CommonFileDAO.softDeleteCommonFileExcludingApproval")
                .getBoundSql(params).getSql();

        assertThat(updateCommentSql).contains("UPPER(owner_type)").contains("'APPROVAL'");
        assertThat(deleteCommentSql).contains("UPPER(owner_type)").contains("'APPROVAL'");
        assertThat(downloadFileSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
        assertThat(deleteFileSql).contains("NOT IN ('APPROVAL', 'APPROVAL_COMMENT')");
    }

    private void parseMapper(Configuration configuration, String resourcePath) throws Exception {
        try (InputStream input = Resources.getResourceAsStream(resourcePath)) {
            new XMLMapperBuilder(input, configuration, resourcePath, configuration.getSqlFragments()).parse();
        }
    }

    private void assertDraftingCategoryJdbcType(BoundSql boundSql) {
        ParameterMapping mapping = boundSql.getParameterMappings().stream()
                .filter(parameter -> "draftingWorkCategoryId".equals(parameter.getProperty()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("draftingWorkCategoryId mapping is missing"));

        assertThat(mapping.getJdbcType()).isEqualTo(JdbcType.BIGINT);
    }
}
