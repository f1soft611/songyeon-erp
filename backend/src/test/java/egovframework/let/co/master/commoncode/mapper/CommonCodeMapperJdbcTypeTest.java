package egovframework.let.co.master.commoncode.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

import org.junit.jupiter.api.Test;

class CommonCodeMapperJdbcTypeTest {

    @Test
    void postgresGroupMapperBindsNullableParentGroupIdAsBigInt() throws Exception {
        String xml = readResource("egovframework/mapper/let/co/master/commoncode/CommonCodeGroup_SQL_postgresql.xml");

        assertThat(xml).contains("#{parentGroupId, jdbcType=BIGINT}");
        assertThat(xml).contains("tb_common_code_group");
    }

    @Test
    void postgresItemMapperBindsNullableParentItemIdAsBigInt() throws Exception {
        String xml = readResource("egovframework/mapper/let/co/master/commoncode/CommonCodeItem_SQL_postgresql.xml");

        assertThat(xml).contains("#{parentItemId, jdbcType=BIGINT}");
        assertThat(xml).contains("tb_common_code_item");
    }

    @Test
    void postgresIdSequenceMapperUsesAtomicUpsertWithoutTenantId() throws Exception {
        String xml = readResource("egovframework/mapper/let/common/idsequence/IdSequence_SQL_postgresql.xml");

        assertThat(xml).contains("INSERT INTO tb_id_sequence");
        assertThat(xml).contains("ON CONFLICT (generator_key, scope_key_1, scope_key_2)");
        assertThat(xml).contains("RETURNING last_issued_value");
        assertThat(xml).doesNotContain("tenant_id");
    }

    private String readResource(String path) throws IOException {
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream(path)) {
            assertThat(stream).isNotNull();
            return readFully(stream);
        }
    }

    private String readFully(InputStream stream) throws IOException {
        byte[] buffer = new byte[4096];
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int read;

        while ((read = Objects.requireNonNull(stream).read(buffer)) != -1) {
            output.write(buffer, 0, read);
        }

        return output.toString(StandardCharsets.UTF_8.name());
    }
}
