package egovframework.let.uat.uia.service.impl;

import javax.annotation.Resource;

import org.springframework.stereotype.Component;

import egovframework.com.cmm.LoginVO;

/**
 * 로그인한 사람의 사번(employees.id = tb_login_account.login_code)을 찾는다(송연, 2026-10-22).
 *
 * <p>송연 로그인 uniqId 는 S_ERP 와 같이 tb_user.user_id 다(전자결재가 이 값으로 사람을 찾는다).
 * 등록자 · 수정자 · 문서함 잠금처럼 사번이 필요한 송연 화면은 이 도우미로 사번을 얻는다.</p>
 *
 * <ul>
 *   <li>uniqId 가 0 으로 시작하거나 숫자가 아니면 사번 그대로 본다(tb_user 가 없는 계정 · 바꾸기 전에 받은 토큰).
 *       송연 사번은 8자리 앞자리 0(00000001 …)이고 tb_user.user_id 는 1 부터 매기는 번호라 겹치지 않는다.</li>
 *   <li>그 밖이면 tb_user → tb_login_account.login_code 로 찾는다. 못 찾으면 null.</li>
 * </ul>
 */
@Component("loginEmployeeResolver")
public class LoginEmployeeResolver {

    @Resource(name = "loginDAO")
    private LoginDAO loginDAO;

    public String employeeId(LoginVO user) {
        if (user == null || user.getUniqId() == null || user.getUniqId().trim().isEmpty()) {
            return null;
        }
        String uniqId = user.getUniqId().trim();
        if (!uniqId.matches("[1-9][0-9]{0,17}")) {
            return uniqId;
        }
        try {
            return loginDAO.selectEmployeeIdByUserId(user.getTenantId(), Long.valueOf(uniqId));
        } catch (Exception ex) {
            throw new IllegalStateException("로그인한 사원을 찾지 못했습니다", ex);
        }
    }
}
