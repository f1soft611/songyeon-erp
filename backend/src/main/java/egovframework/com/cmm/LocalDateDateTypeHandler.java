package egovframework.com.cmm;

import java.sql.CallableStatement;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;

/**
 * log4jdbc/DBCP 환경에서 LocalDate를 안전하게 java.sql.Date로 변환하는 TypeHandler.
 * <p>
 * MyBatis 기본 LocalDateTypeHandler는 {@code ResultSet#getObject(String, Class)}를 사용하지만
 * log4jdbc ResultSetSpy가 이를 지원하지 않아 {@code getDate}로 변환한다.
 */
public class LocalDateDateTypeHandler extends BaseTypeHandler<LocalDate> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, LocalDate parameter, JdbcType jdbcType)
            throws SQLException {
        ps.setDate(i, Date.valueOf(parameter));
    }

    @Override
    public LocalDate getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return toLocalDate(rs.getDate(columnName));
    }

    @Override
    public LocalDate getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return toLocalDate(rs.getDate(columnIndex));
    }

    @Override
    public LocalDate getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return toLocalDate(cs.getDate(columnIndex));
    }

    private LocalDate toLocalDate(Date date) {
        return date != null ? date.toLocalDate() : null;
    }
}
