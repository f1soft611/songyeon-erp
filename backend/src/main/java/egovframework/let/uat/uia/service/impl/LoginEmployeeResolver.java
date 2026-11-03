package egovframework.let.uat.uia.service.impl;

import org.springframework.stereotype.Component;

import egovframework.com.cmm.LoginVO;

/**
 * 로그인한 사람의 사번(employees.id)을 돌려준다(송연).
 *
 * <p>2026-11-03 부터 로그인 uniqId 가 사번이다(tb_login_account.login_id = tb_user.user_id = employees.id).
 * 배포 전에 받은 토큰도 EgovJwtTokenUtil 이 uniqId 를 사번(id)으로 맞춰 읽는다. 그래서 uniqId 를 그대로 돌려준다.
 * 등록자 · 수정자 · 문서함 잠금처럼 사번이 필요한 송연 화면이 이 도우미를 쓴다.</p>
 */
@Component("loginEmployeeResolver")
public class LoginEmployeeResolver {

    public String employeeId(LoginVO user) {
        if (user == null || user.getUniqId() == null || user.getUniqId().trim().isEmpty()) {
            return null;
        }
        return user.getUniqId().trim();
    }
}
