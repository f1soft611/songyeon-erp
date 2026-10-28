package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.domain.model.MyProfileUpdateRequestVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;
import egovframework.let.uat.uia.domain.repository.ProfileSettingsDAO;

class ProfileSettingsServiceImplTest {

    @Test
    void updateProfileUsesAuthenticatedLoginIdentifiers() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        LoginVO user = authenticatedUser();
        MyProfileUpdateRequestVO request = new MyProfileUpdateRequestVO();
        request.setEmail("new@example.com");
        request.setProfileImage(null);
        request.setStampImage(null);

        service.updateMyProfile(user, request);

        verify(dao).updateMyProfile(argThat(params ->
                Long.valueOf(7L).equals(params.get("tenantId"))
                && "admin".equals(params.get("loginCode"))
                        && "new@example.com".equals(params.get("email"))));
    }

    @Test
    void rejectsPasswordChangeWhenCurrentPasswordDoesNotMatch() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        when(dao.selectPasswordHash(anyMap())).thenReturn("different-hash");
        PasswordChangeRequestVO request = passwordRequest("wrong", "new-password", "new-password");

        assertThrows(IllegalArgumentException.class, () ->
                service.changeMyPassword(authenticatedUser(), request));

        verify(dao, never()).updatePassword(anyMap());
    }

    @Test
    void rejectsPasswordChangeWhenConfirmationDoesNotMatch() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        PasswordChangeRequestVO request = passwordRequest("current-password", "new-password", "other-password");

        assertThrows(IllegalArgumentException.class, () ->
                service.changeMyPassword(authenticatedUser(), request));

        verify(dao, never()).updatePassword(anyMap());
    }

    @Test
    void songyeonEmailMayBeBlankButMustBeValidWhenGiven() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao);
        MyProfileUpdateRequestVO blank = new MyProfileUpdateRequestVO();
        blank.setEmail("  ");

        // 송연 직원은 이메일이 없던 표라 비워 둘 수 있다(NULL 로 저장)
        service.updateMyProfile(authenticatedUser(), blank);
        verify(dao).updateMyProfile(argThat(params -> params.containsKey("email") && params.get("email") == null));

        MyProfileUpdateRequestVO wrong = new MyProfileUpdateRequestVO();
        wrong.setEmail("not-an-email");
        assertEquals("이메일 형식이 올바르지 않습니다.",
                assertThrows(IllegalArgumentException.class, () -> service.updateMyProfile(authenticatedUser(), wrong)).getMessage());
    }

    @Test
    void changesSongyeonWerkzeugPasswordWithSameFormat() throws Exception {
        ProfileSettingsDAO dao = mock(ProfileSettingsDAO.class);
        WerkzeugPasswordVerifier verifier = new WerkzeugPasswordVerifier();
        ProfileSettingsServiceImpl service = new ProfileSettingsServiceImpl(dao, verifier);
        // 송연 employees.password_hash 는 Werkzeug(scrypt) 해시
        when(dao.selectPasswordHash(anyMap())).thenReturn(verifier.encode("old-password-1"));

        service.changeMyPassword(authenticatedUser(), passwordRequest("old-password-1", "new-password-2", "new-password-2"));

        ArgumentCaptor<java.util.Map<String, Object>> saved = ArgumentCaptor.forClass(java.util.Map.class);
        verify(dao).updatePassword(saved.capture());
        String hash = (String) saved.getValue().get("password");
        assertTrue(hash.startsWith("scrypt:32768:8:1$"));
        assertTrue(verifier.matches("new-password-2", hash));
        assertFalse(verifier.matches("old-password-1", hash));
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(7L);
        user.setId("admin");
        user.setUniqId("11");
        return user;
    }

    private static PasswordChangeRequestVO passwordRequest(
            String currentPassword,
            String newPassword,
            String confirmation) {
        PasswordChangeRequestVO request = new PasswordChangeRequestVO();
        request.setCurrentPassword(currentPassword);
        request.setNewPassword(newPassword);
        request.setNewPasswordConfirm(confirmation);
        return request;
    }
}
