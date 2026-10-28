package egovframework.let.uat.uia.service.impl;

import egovframework.com.cmm.LoginVO;
import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;

import org.springframework.stereotype.Repository;

/**
 * 일반 로그인을 처리하는 비즈니스 구현 클래스
 * @author 공통서비스 개발팀 박지욱
 * @since 2009.03.06
 * @version 1.0
 * @see
 *
 * <pre>
 * << 개정이력(Modification Information) >>
 *
 *   수정일      수정자          수정내용
 *  -------    --------    ---------------------------
 *  2009.03.06  박지욱          최초 생성
 *  2011.08.31  JJY            경량환경 템플릿 커스터마이징버전 생성
 *
 *  </pre>
 */
@Repository("loginDAO")
public class LoginDAO extends EgovAbstractMapper {

	/**
	 * 일반 로그인을 처리한다
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO actionLogin(LoginVO vo) throws Exception {
		return (LoginVO) selectOne("loginDAO.actionLogin", vo);
	}

	/**
	 * 송연 employees 계정으로 로그인 정보를 조회한다 (password 에는 Werkzeug 해시가 담긴다)
	 * @param tenantCode 메뉴·권한용 내부 테넌트 코드
	 * @param username 송연 아이디
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO actionLoginEmployee(String tenantCode, String username) throws Exception {
		Map<String, Object> params = new HashMap<>();
		params.put("tenantCode", tenantCode);
		params.put("username", username);
		return (LoginVO) selectOne("loginDAO.actionLoginEmployee", params);
	}

	/**
	 * 아이디를 찾는다.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO searchId(LoginVO vo) throws Exception {
		return (LoginVO) selectOne("loginDAO.searchId", vo);
	}

	/**
	 * 비밀번호를 찾는다.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	public LoginVO searchPassword(LoginVO vo) throws Exception {
		return (LoginVO) selectOne("loginDAO.searchPassword", vo);
	}

	/**
	 * 변경된 비밀번호를 저장한다.
	 * @param vo LoginVO
	 * @exception Exception
	 */
	public void updatePassword(LoginVO vo) throws Exception {
		update("loginDAO.updatePassword", vo);
	}

	/**
	 * 테넌트 내 이메일로 로그인 코드를 조회한다.
	 * @param tenantId 테넌트 ID
	 * @param email 이메일 주소
	 * @return 로그인 코드
	 * @exception Exception
	 */
	public String selectLoginCodeByTenantIdAndEmail(Long tenantId, String email) throws Exception {
		Map<String, Object> params = new HashMap<String, Object>();
		params.put("tenantId", tenantId);
		params.put("email", email);
		return (String) selectOne("loginDAO.selectLoginCodeByTenantIdAndEmail", params);
	}

	/**
	 * 테넌트 코드로 테넌트 ID를 조회한다.
	 * @param tenantCode 테넌트 코드
	 * @return 테넌트 ID
	 * @exception Exception
	 */
	public Long selectTenantIdByCode(String tenantCode) throws Exception {
		return (Long) selectOne("loginDAO.selectTenantIdByCode", tenantCode);
	}

	/**
	 * 로그인 uniqId(tb_user.user_id)로 사번(tb_login_account.login_code)을 찾는다(송연, 2026-10-22).
	 * @param tenantId 테넌트 ID(없으면 조건에서 뺀다)
	 * @param userId tb_user.user_id
	 * @return 사번 또는 null
	 * @exception Exception
	 */
	public String selectEmployeeIdByUserId(Long tenantId, Long userId) throws Exception {
		Map<String, Object> params = new HashMap<>();
		params.put("tenantId", tenantId);
		params.put("userId", userId);
		return (String) selectOne("loginDAO.selectEmployeeIdByUserId", params);
	}
}
