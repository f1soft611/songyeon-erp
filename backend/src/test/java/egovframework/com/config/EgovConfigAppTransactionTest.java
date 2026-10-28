package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.lang.reflect.Method;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.PointcutAdvisor;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.service.impl.EgovLoginServiceImpl;

class EgovConfigAppTransactionTest {

	@DisplayName("로그인 액션은 전역 트랜잭션 포인트컷에서 제외된다")
	@Test
	void txAdvisor_doesNotWrapLoginActionLogin() throws Exception {
		EgovConfigAppTransaction config = new EgovConfigAppTransaction();
		PointcutAdvisor advisor = (PointcutAdvisor) config.txAdvisor(new DataSourceTransactionManager());

		Method actionLogin = EgovLoginServiceImpl.class.getMethod("actionLogin", LoginVO.class);

		assertFalse(advisor.getPointcut().getMethodMatcher().matches(actionLogin, EgovLoginServiceImpl.class));
	}
}