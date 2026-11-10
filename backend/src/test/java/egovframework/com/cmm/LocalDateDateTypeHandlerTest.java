package egovframework.com.cmm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.sql.CallableStatement;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;

import org.apache.ibatis.builder.xml.XMLConfigBuilder;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LocalDateDateTypeHandlerTest {

    private final LocalDateDateTypeHandler typeHandler = new LocalDateDateTypeHandler();

    @DisplayName("LocalDate는 java.sql.Date로 저장된다")
    @Test
    void setNonNullParameter_usesSqlDate() throws Exception {
        PreparedStatement preparedStatement = mock(PreparedStatement.class);
        LocalDate value = LocalDate.of(2026, 10, 27);

        typeHandler.setNonNullParameter(preparedStatement, 1, value, null);

        verify(preparedStatement).setDate(eq(1), eq(Date.valueOf(value)));
    }

    @DisplayName("LocalDate는 getObject(LocalDate.class) 대신 getDate로 읽는다")
    @Test
    void getNullableResult_usesGetDate() throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        LocalDate expected = LocalDate.of(2026, 10, 27);
        when(resultSet.getDate("orderDt")).thenReturn(Date.valueOf(expected));

        assertEquals(expected, typeHandler.getNullableResult(resultSet, "orderDt"));
        verify(resultSet).getDate("orderDt");
    }

    @DisplayName("Date가 없으면 null을 반환한다")
    @Test
    void getNullableResult_returnsNullWhenDateMissing() throws Exception {
        CallableStatement callableStatement = mock(CallableStatement.class);
        when(callableStatement.getDate(1)).thenReturn(null);

        assertNull(typeHandler.getNullableResult(callableStatement, 1));
    }

    @DisplayName("mapper-config.xml은 LocalDate 타입에 log4jdbc 호환 TypeHandler를 등록한다")
    @Test
    void mapperConfig_registersLocalDateHandler() throws Exception {
        try (InputStream config = getClass()
                .getResourceAsStream("/egovframework/mapper/config/mapper-config.xml")) {
            Configuration configuration = new XMLConfigBuilder(config).parse();

            assertInstanceOf(LocalDateDateTypeHandler.class,
                    configuration.getTypeHandlerRegistry().getTypeHandler(LocalDate.class));
        }
    }
}
