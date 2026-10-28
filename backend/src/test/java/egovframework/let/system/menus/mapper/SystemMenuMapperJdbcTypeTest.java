package egovframework.let.system.menus.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

import org.junit.jupiter.api.Test;

class SystemMenuMapperJdbcTypeTest {

    @Test
    void postgresMapperExplicitlyBindsNullableParentMenuIdAsBigInt() throws Exception {
        try (InputStream stream = getClass()
                .getClassLoader()
                .getResourceAsStream("egovframework/mapper/let/system/menus/EgovSystemMenu_SQL_postgresql.xml")) {
            String xml = readFully(stream);
            assertThat(xml).contains("#{parentMenuId, jdbcType=BIGINT}");
            assertThat(xml).contains("#{parentMenuId, jdbcType=BIGINT}");
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
