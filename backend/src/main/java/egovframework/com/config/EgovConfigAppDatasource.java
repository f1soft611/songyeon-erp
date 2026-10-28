package egovframework.com.config;

import java.util.HashMap;
import java.util.Map;

import javax.annotation.PostConstruct;
import javax.sql.DataSource;

import org.apache.commons.dbcp2.BasicDataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * @ClassName : EgovConfigAppDatasource.java
 * @Description : DataSource 설정
 *
 * @author : 윤주호
 * @since  : 2021. 7. 20
 * @version : 1.0
 *
 * <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일              수정자               수정내용
 *  -------------  ------------   ---------------------
 *   2021. 7. 20    윤주호               최초 생성
 * </pre>
 *
 */
@Configuration
public class EgovConfigAppDatasource {

	/**
	 *  @Value 을 어노테이션을 이용하는 방법
	 */
	//	@Value("${Globals.DbType}")
	//	private String dbType;
	//
	//	@Value("${Globals.DriverClassName}")
	//	private String className;
	//
	//	@Value("${Globals.Url}")
	//	private String url;
	//
	//	@Value("${Globals.UserName}")
	//	private String userName;
	//
	//	@Value("${Globals.Password}")
	//	private String password;

	/**
	 *  Environment 의존성 주입하여 사용하는 방법
	 */

	@Autowired
	Environment env;

	private String dbType;

	private String className;

	private String url;

	private String userName;

	private String password;

	@PostConstruct
	void init() {
		dbType = env.getProperty("Globals.DbType");
		//Exception 처리 필요
		className = env.getProperty("Globals." + dbType + ".DriverClassName");
		url = toLog4jdbcUrl(className, env.getProperty("Globals." + dbType + ".Url"));
		userName = env.getProperty("Globals." + dbType + ".UserName");
		password = env.getProperty("Globals." + dbType + ".Password");
	}

	/**
	 * SQL 로그용 log4jdbc 드라이버(DriverSpy)를 쓸 때, 일반 JDBC 주소(jdbc:postgresql:…)를
	 * log4jdbc 주소(jdbc:log4jdbc:postgresql:…)로 바꾼다.
	 * 송연 DB 주소는 환경변수(SONGYEON_DB_URL)로 일반 주소 그대로 받기 때문이다.
	 */
	static String toLog4jdbcUrl(String driverClassName, String jdbcUrl) {
		if (jdbcUrl == null || !"net.sf.log4jdbc.DriverSpy".equals(driverClassName)) {
			return jdbcUrl;
		}
		String trimmed = jdbcUrl.trim();
		if (trimmed.startsWith("jdbc:") && !trimmed.startsWith("jdbc:log4jdbc:")) {
			return "jdbc:log4jdbc:" + trimmed.substring("jdbc:".length());
		}
		return trimmed;
	}

	/**
	 * @return [dataSource 설정] basicDataSource 설정
	 */
	private DataSource basicDataSource() {
		BasicDataSource basicDataSource = new BasicDataSource();
		basicDataSource.setDriverClassName(className);
		basicDataSource.setUrl(url);
		basicDataSource.setUsername(userName);
		basicDataSource.setPassword(password);
		return basicDataSource;
	}

	/**
	 * @return [DataSource 설정]
	 */
	@Bean(name = "platformDataSource")
	public DataSource platformDataSource() {
		return basicDataSource();
	}

	@Bean(name = "centralDataSource")
	public DataSource centralDataSource() {
		return basicDataSource();
	}

	@Bean(name = {"dataSource", "egov.dataSource", "egovDataSource"})
	@Primary
	public DataSource dataSource() {
		return basicDataSource();
	}

	@Bean
	public JdbcTemplate jdbcTemplate(DataSource dataSource) {
		return new JdbcTemplate(dataSource);
	}
}
