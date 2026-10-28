package egovframework.let.uat.uia.service.impl;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.service.EgovLoginService;
import egovframework.let.utl.fcc.service.EgovNumberUtil;
import egovframework.let.utl.fcc.service.EgovStringUtil;
import egovframework.let.utl.sim.service.EgovFileScrty;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;

import javax.annotation.Resource;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import lombok.extern.slf4j.Slf4j;

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
 *  2026.06.23  AI             다중 테넌트 지원 - TenantContextHolder 통합
 *
 *  </pre>
 */
@Slf4j
@Service("loginService")
public class EgovLoginServiceImpl extends EgovAbstractServiceImpl implements EgovLoginService {

	@Resource(name = "loginDAO")
	private LoginDAO loginDAO;

	@Resource(name = "werkzeugPasswordVerifier")
	private WerkzeugPasswordVerifier passwordVerifier;

	/** 메뉴·권한(tb_module/tb_menu/tb_role)용 내부 테넌트 코드. 로그인 화면에서 입력받지 않는다. */
	@Value("${Globals.songyeon.tenantCode:SONGYEON}")
	private String songyeonTenantCode;

	/**
	 * 일반 로그인을 처리한다
	 * 송연: 계정은 S_ERP 계정 표(tb_login_account, login_code = 사번, 비밀번호 Werkzeug 해시)이고 이름 · 부서는 employees 에서 읽는다.
	 * 역할이 없는 계정도 로그인은 된다(메뉴 · 관리자 기능은 없음).
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO actionLogin(LoginVO vo) throws Exception {
		if (vo == null) {
			return null;
		}

		String inputId = vo.getId() == null ? "" : vo.getId().trim();
		String plainPassword = vo.getPassword();
		if (inputId.isEmpty() || inputId.length() > 200 || plainPassword == null || plainPassword.isEmpty()) {
			return new LoginVO();
		}

		LoginVO loginVO = loginDAO.actionLoginEmployee(songyeonTenantCode, inputId);
		String storedHash = loginVO == null ? WerkzeugPasswordVerifier.DUMMY_HASH : loginVO.getPassword();
		boolean matched = passwordVerifier.matches(plainPassword, storedHash);
		if (loginVO != null && matched && isValidLogin(loginVO)) {
			if (loginVO.getTenantId() == null) {
				log.warn("Login blocked: tenant seed missing for tenantCode={}", songyeonTenantCode);
				return new LoginVO();
			}
			loginVO.setPassword(null);
			log.info("Login successful: userId={}", loginVO.getId());
			return loginVO;
		}

		log.warn("Login failed: userId={}", inputId);
		return new LoginVO();
	}

	private boolean isValidLogin(LoginVO loginVO) {
		return loginVO != null
				&& loginVO.getId() != null
				&& !loginVO.getId().isEmpty()
				&& loginVO.getPassword() != null
				&& !loginVO.getPassword().isEmpty();
	}

	private boolean isEmailFormat(String value) {
		return value != null && value.contains("@") && value.indexOf('@') > 0 && value.indexOf('@') < value.length() - 1;
	}

	private String extractLocalPart(String value) {
		if (!isEmailFormat(value)) {
			return null;
		}

		int atIndex = value.indexOf('@');
		if (atIndex <= 0) {
			return null;
		}

		String localPart = value.substring(0, atIndex).trim();
		if (localPart.isEmpty()) {
			return null;
		}
		return localPart;
	}


	/**
	 * 아이디를 찾는다.
	 * @param vo LoginVO
	 * @return LoginVO
	 * @exception Exception
	 */
	@Override
	public LoginVO searchId(LoginVO vo) throws Exception {

		// 1. 이름, 이메일주소가 DB와 일치하는 사용자 ID를 조회한다.
		LoginVO loginVO = loginDAO.searchId(vo);

		// 2. 결과를 리턴한다.
		if (loginVO != null && !loginVO.getId().equals("")) {
			return loginVO;
		} else {
			loginVO = new LoginVO();
		}

		return loginVO;
	}

	/**
	 * 비밀번호를 찾는다.
	 * @param vo LoginVO
	 * @return boolean
	 * @exception Exception
	 */
	@Override
	public boolean searchPassword(LoginVO vo) throws Exception {

		boolean result = true;

		// 1. 아이디, 이름, 이메일주소, 비밀번호 힌트, 비밀번호 정답이 DB와 일치하는 사용자 Password를 조회한다.
		LoginVO loginVO = loginDAO.searchPassword(vo);
		if (loginVO == null || loginVO.getPassword() == null || loginVO.getPassword().equals("")) {
			return false;
		}

		// 2. 임시 비밀번호를 생성한다.(영+영+숫+영+영+숫=6자리)
		String newpassword = "";
		for (int i = 1; i <= 6; i++) {
			// 영자
			if (i % 3 != 0) {
				newpassword += EgovStringUtil.getRandomStr('a', 'z');
				// 숫자
			} else {
				newpassword += EgovNumberUtil.getRandomNum(0, 9);
			}
		}

		// 3. 임시 비밀번호를 암호화하여 DB에 저장한다.
		LoginVO pwVO = new LoginVO();
		String enpassword = EgovFileScrty.encryptPassword(newpassword, vo.getId());
		pwVO.setId(vo.getId());
		pwVO.setPassword(enpassword);
		pwVO.setUserSe(vo.getUserSe());
		loginDAO.updatePassword(pwVO);

		return result;
	}
}