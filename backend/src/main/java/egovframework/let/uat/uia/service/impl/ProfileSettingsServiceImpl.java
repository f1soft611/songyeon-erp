package egovframework.let.uat.uia.service.impl;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import javax.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.domain.model.MyProfileUpdateRequestVO;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;
import egovframework.let.uat.uia.domain.repository.ProfileSettingsDAO;
import egovframework.let.uat.uia.service.ProfileSettingsService;

@Service("profileSettingsService")
public class ProfileSettingsServiceImpl extends EgovAbstractServiceImpl implements ProfileSettingsService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    @Resource(name = "profileSettingsDAO")
    private ProfileSettingsDAO profileSettingsDAO;

    // 송연 employees.password_hash(Werkzeug) 확인·생성
    @Resource(name = "werkzeugPasswordVerifier")
    private WerkzeugPasswordVerifier passwordVerifier;

    public ProfileSettingsServiceImpl() {
    }

    public ProfileSettingsServiceImpl(ProfileSettingsDAO profileSettingsDAO) {
        this(profileSettingsDAO, new WerkzeugPasswordVerifier());
    }

    public ProfileSettingsServiceImpl(ProfileSettingsDAO profileSettingsDAO, WerkzeugPasswordVerifier passwordVerifier) {
        this.profileSettingsDAO = profileSettingsDAO;
        this.passwordVerifier = passwordVerifier;
    }

    @Override
    public MyProfileVO getMyProfile(LoginVO user) throws Exception {
        return profileSettingsDAO.selectMyProfile(authenticatedParams(user));
    }

    @Override
    public MyProfileVO updateMyProfile(LoginVO user, MyProfileUpdateRequestVO request) throws Exception {
        if (request == null) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }
        // 송연 직원은 이메일이 없던 표라 비워 둘 수 있다. 적었을 때만 형식을 본다.
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        if (!email.isEmpty() && !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("이메일 형식이 올바르지 않습니다.");
        }
        Map<String, Object> params = authenticatedParams(user);
        params.put("email", email.isEmpty() ? null : email);
        params.put("profileImage", ProfileImageNormalizer.normalize(request.getProfileImage()));
        params.put("stampImage", ProfileImageNormalizer.normalize(request.getStampImage()));
        profileSettingsDAO.updateMyProfile(params);
        return profileSettingsDAO.selectMyProfile(authenticatedParams(user));
    }

    @Override
    public void changeMyPassword(LoginVO user, PasswordChangeRequestVO request) throws Exception {
        if (request == null || isBlank(request.getCurrentPassword())
                || isBlank(request.getNewPassword())
                || isBlank(request.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
        }
        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("변경 비밀번호와 확인값이 일치하지 않습니다.");
        }
        if (request.getNewPassword().length() < 8) {
            throw new IllegalArgumentException("변경 비밀번호는 8자 이상이어야 합니다.");
        }

        Map<String, Object> params = authenticatedParams(user);
        String passwordHash = profileSettingsDAO.selectPasswordHash(params);
        // 계정 비밀번호(tb_login_account · employees 같은 값)는 송연 Werkzeug 해시라 그 방식으로 확인하고 같은 방식으로 새로 만든다
        if (passwordHash == null || !passwordVerifier.matches(request.getCurrentPassword(), passwordHash)) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        Map<String, Object> updateParams = authenticatedParams(user);
        updateParams.put("password", passwordVerifier.encode(request.getNewPassword()));
        profileSettingsDAO.updatePassword(updateParams);
    }

    private Map<String, Object> authenticatedParams(LoginVO user) {
        if (user == null || user.getTenantId() == null || isBlank(user.getId())) {
            throw new IllegalArgumentException("인증된 사용자 정보가 없습니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", user.getTenantId());
        params.put("loginCode", user.getId().trim());
        return params;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
