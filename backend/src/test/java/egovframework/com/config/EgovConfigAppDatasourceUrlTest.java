package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EgovConfigAppDatasourceUrlTest {

	private static final String SPY = "net.sf.log4jdbc.DriverSpy";

	@DisplayName("log4jdbc 드라이버면 일반 JDBC 주소에 log4jdbc 를 붙인다(SQL 로그용)")
	@Test
	void addsLog4jdbcPrefixForDriverSpy() {
		assertEquals("jdbc:log4jdbc:postgresql://db-host:5432/songyeon",
				EgovConfigAppDatasource.toLog4jdbcUrl(SPY, "jdbc:postgresql://db-host:5432/songyeon"));
	}

	@DisplayName("이미 log4jdbc 주소면 그대로 둔다")
	@Test
	void keepsExistingLog4jdbcUrl() {
		assertEquals("jdbc:log4jdbc:postgresql://db-host:5432/songyeon",
				EgovConfigAppDatasource.toLog4jdbcUrl(SPY, "jdbc:log4jdbc:postgresql://db-host:5432/songyeon"));
	}

	@DisplayName("다른 드라이버거나 주소가 없으면 바꾸지 않는다")
	@Test
	void leavesOtherDriversAlone() {
		assertEquals("jdbc:postgresql://db-host:5432/songyeon",
				EgovConfigAppDatasource.toLog4jdbcUrl("org.postgresql.Driver", "jdbc:postgresql://db-host:5432/songyeon"));
		assertNull(EgovConfigAppDatasource.toLog4jdbcUrl(SPY, null));
	}
}
