package egovframework.com.cmm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LocalDateTimeTimestampTypeHandlerTest {

    private final LocalDateTimeTimestampTypeHandler typeHandler = new LocalDateTimeTimestampTypeHandler();

    @DisplayName("LocalDateTime은 Timestamp로 저장된다")
    @Test
    void setNonNullParameter_usesTimestamp() throws Exception {
        PreparedStatement preparedStatement = mock(PreparedStatement.class);
        LocalDateTime value = LocalDateTime.of(2026, 7, 1, 14, 0, 0);

        typeHandler.setNonNullParameter(preparedStatement, 1, value, null);

        verify(preparedStatement).setTimestamp(eq(1), eq(Timestamp.valueOf(value)));
    }

    @DisplayName("LocalDateTime은 Timestamp로 읽는다")
    @Test
    void getNullableResult_usesTimestamp() throws Exception {
        ResultSet resultSet = mock(ResultSet.class);
        LocalDateTime expected = LocalDateTime.of(2026, 7, 1, 14, 0, 0);
        when(resultSet.getTimestamp("expiresAt")).thenReturn(Timestamp.valueOf(expected));

        LocalDateTime actual = typeHandler.getNullableResult(resultSet, "expiresAt");

        assertEquals(expected, actual);
        verify(resultSet).getTimestamp("expiresAt");
    }

    @DisplayName("Timestamp가 없으면 null을 반환한다")
    @Test
    void getNullableResult_returnsNullWhenTimestampMissing() throws Exception {
        CallableStatement callableStatement = mock(CallableStatement.class);
        when(callableStatement.getTimestamp(1)).thenReturn(null);

        assertNull(typeHandler.getNullableResult(callableStatement, 1));
    }
}