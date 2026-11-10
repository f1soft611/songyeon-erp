package egovframework.com.cmm;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

// 2026-11-04 S_ERP mapper-config 와 같이 날짜 처리기를 등록한다. 송연 DB 접속은 log4jdbc(ResultSetSpy)를 거쳐
// getObject(LocalDate/LocalDateTime.class)를 지원하지 않는다(등록하지 않으면 알림 목록이 500)
class MapperConfigTypeHandlerTest {
    @Test
    void registersLog4jdbcSafeJavaTimeHandlers() throws Exception {
        try (InputStream input = getClass().getClassLoader()
                .getResourceAsStream("egovframework/mapper/config/mapper-config.xml")) {
            String xml = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            assertThat(xml).contains("javaType=\"java.time.LocalDate\" handler=\"egovframework.com.cmm.LocalDateDateTypeHandler\"");
            assertThat(xml).contains("javaType=\"java.time.LocalDateTime\" handler=\"egovframework.com.cmm.LocalDateTimeTimestampTypeHandler\"");
        }
    }
}
