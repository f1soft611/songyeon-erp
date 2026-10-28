package egovframework.let.groupware.community.archive.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.io.Resources;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.Test;

class ArchiveBoardTenantScopeMapperTest {
    private static final String RESOURCE =
            "egovframework/mapper/let/groupware/community/archive/ArchiveBoard_SQL_postgresql.xml";

    @Test
    void readsAndMutationsFixArchiveAndBindTenantAndPost() throws Exception {
        Configuration configuration = parse();
        for (String id : new String[] {"selectArchivePostList", "selectArchivePostCount",
                "selectArchivePostById", "updateArchivePost", "softDeleteArchivePost"}) {
            BoundSql sql = sql(configuration, id);
            assertThat(sql.getSql()).as(id).contains("tenant_id = ?", "board_type_code = 'ARCHIVE'");
            assertThat(properties(sql)).contains("tenantId").doesNotContain("boardTypeCode");
            if (!id.endsWith("List") && !id.endsWith("Count")) {
                assertThat(sql.getSql()).contains("post_id = ?");
                assertThat(properties(sql)).contains("postId");
            }
        }
        BoundSql insert = sql(configuration, "insertArchivePost");
        assertThat(insert.getSql()).contains("tenant_id", "board_type_code", "'ARCHIVE'", "category_code",
                "contents_text").doesNotContain("contents_html", "contents_json", "notice_gubun_code");
        assertThat(properties(insert)).contains("tenantId", "categoryCode");
        assertThat(properties(insert).stream().filter("contents"::equals).count()).isEqualTo(2);
        BoundSql update = sql(configuration, "updateArchivePost");
        assertThat(properties(update).stream().filter("contents"::equals).count()).isEqualTo(2);
    }

    @Test
    void uploadAndDeletePostLookupLocksOnlyAnActiveTenantArchivePost() throws Exception {
        BoundSql sql = sql(parse(), "selectArchivePostForUpdate");

        assertThat(sql.getSql()).contains("tenant_id = ?", "board_type_code = 'ARCHIVE'",
                "post_id = ?", "is_deleted = 'N'", "FOR UPDATE");
        assertThat(properties(sql)).contains("tenantId", "postId").doesNotContain("boardTypeCode");
        assertThat(sql(parse(), "selectArchivePostById").getSql()).doesNotContain("FOR UPDATE");
    }

    @Test
    void attachmentsAndCountsRequireTenantArchiveOwnerAndOrdinaryUsage() throws Exception {
        Configuration configuration = parse();
        for (String id : new String[] {"selectArchiveAttachmentList", "selectArchiveAttachmentById"}) {
            BoundSql sql = sql(configuration, id);
            assertThat(sql.getSql()).contains("tenant_id = ?", "owner_type = 'ARCHIVE'",
                    "owner_id = ?", "file_usage_type = 'ATTACHMENT'", "deleted_yn = 'N'");
            assertThat(properties(sql)).contains("tenantId", "postId");
        }
        BoundSql file = sql(configuration, "selectArchiveAttachmentById");
        assertThat(file.getSql()).contains("file_id = ?");
        assertThat(properties(file)).contains("boardFileId");
        for (String id : new String[] {"selectArchivePostList", "selectArchivePostById"}) {
            assertThat(sql(configuration, id).getSql()).contains("bf.tenant_id = ?",
                    "bf.owner_type = 'ARCHIVE'", "bf.owner_id = p.post_id",
                    "bf.file_usage_type = 'ATTACHMENT'");
        }
    }

    @Test
    void filtersAndNewestFirstPagingUseTheApprovedColumns() throws Exception {
        BoundSql list = sql(parse(), "selectArchivePostList");
        assertThat(list.getSql()).contains("p.title ILIKE", "p.contents_text ILIKE",
                "p.writer_name ILIKE", "p.category_code = ?",
                "ORDER BY p.created_at DESC, p.post_id DESC", "LIMIT ? OFFSET ?");
        assertThat(properties(list)).contains("keyword", "categoryCode", "recordCountPerPage", "firstIndex");
        assertThat(sql(parse(), "selectArchiveBoardConfig").getSql())
                .contains("board_type_code = 'ARCHIVE'", "write_auth_level", "file_upload_yn", "use_yn");
    }

    @Test
    void fileListMapperScopesTenantAndFiltersWithoutPaging() throws Exception {
        Configuration configuration = parse();
        BoundSql list = sql(configuration, "selectArchiveFileList");
        assertThat(list.getSql()).contains("f.tenant_id = ?", "p.tenant_id = ?", "p.board_type_code = 'ARCHIVE'",
                "f.owner_type = 'ARCHIVE'", "f.file_usage_type = 'ATTACHMENT'", "f.deleted_yn = 'N'",
                "p.category_code = ?", "f.created_at >= CAST(? AS date)",
                "f.created_at < CAST(? AS date) + INTERVAL '1 day'", "f.mime_type",
                "LOWER(COALESCE(f.mime_type, '')) = 'application/pdf'",
                "LOWER(f.file_name) LIKE '%.pdf'", "ORDER BY f.created_at DESC, f.file_id DESC")
                .doesNotContain("LIMIT", "OFFSET");
        assertThat(properties(list)).contains("tenantId", "keyword", "folderCode", "uploadedFrom", "uploadedTo")
                .doesNotContain("offset", "limit");

        BoundSql count = sql(configuration, "selectArchiveFileCount");
        assertThat(properties(count)).contains("tenantId", "keyword", "folderCode", "uploadedFrom", "uploadedTo");
        assertThat(count.getSql()).contains("application/pdf", "LOWER(f.file_name) LIKE '%.pdf'");
    }

    @Test
    void fileTypeMapperBranchesUseKnownMimeAndGenericExtensionFallbacks() throws Exception {
        Configuration configuration = parse();
        Map<String, String> typeMarkers = new HashMap<>();
        typeMarkers.put("DOCUMENT", "application/msword");
        typeMarkers.put("SPREADSHEET", "application/vnd.ms-excel");
        typeMarkers.put("PRESENTATION", "application/vnd.ms-powerpoint");
        typeMarkers.put("PDF", "application/pdf");
        typeMarkers.put("IMAGE", "LIKE 'image/%'");
        typeMarkers.put("VIDEO", "LIKE 'video/%'");
        typeMarkers.put("ARCHIVE", "application/zip");

        for (Map.Entry<String, String> type : typeMarkers.entrySet()) {
            String renderedSql = sql(configuration, "selectArchiveFileList", type.getKey()).getSql();
            assertThat(renderedSql).contains(type.getValue(), "application/octet-stream",
                    "LOWER(f.file_name) LIKE");
            assertThat(renderedSql).doesNotContain("LIMIT", "OFFSET");
        }

        String allTypesSql = sql(configuration, "selectArchiveFileList", "ALL").getSql();
        assertThat(allTypesSql).doesNotContain("application/msword", "application/pdf",
                "LIKE 'image/%'", "LIKE 'video/%'");
    }

    private Configuration parse() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(RESOURCE)) {
            new XMLMapperBuilder(input, configuration, RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }

    private BoundSql sql(Configuration configuration, String id) {
        return sql(configuration, id, "PDF");
    }

    private BoundSql sql(Configuration configuration, String id, String fileType) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("postId", 13L);
        params.put("boardFileId", 31L);
        params.put("keyword", "manual");
        params.put("categoryCode", "GENERAL");
        params.put("folderCode", "GENERAL");
        params.put("rootOnly", false);
        params.put("uploadedFrom", "2025-10-20");
        params.put("uploadedTo", "2026-10-20");
        params.put("fileType", fileType);
        params.put("offset", 0);
        params.put("limit", 20);
        return configuration.getMappedStatement("ArchiveBoardDAO." + id).getBoundSql(params);
    }

    private List<String> properties(BoundSql sql) {
        return sql.getParameterMappings().stream().map(item -> item.getProperty()).collect(Collectors.toList());
    }
}
