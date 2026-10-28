package egovframework.let.uat.uia.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.Test;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;
import egovframework.let.uat.uia.service.ProfileSettingsService;

class ProfileSettingsApiControllerTest {

    @Test
    void profileResponseExposesFieldsDirectlyInResult() throws Exception {
        ProfileSettingsService service = mock(ProfileSettingsService.class);
        ProfileSettingsApiController controller = new ProfileSettingsApiController(
                new ResultVoHelper(), service);
        LoginVO user = authenticatedUser();
        MyProfileVO profile = new MyProfileVO();
        profile.setUserId("admin");
        profile.setEmail("user@example.com");
        when(service.getMyProfile(user)).thenReturn(profile);

        ResultVO response = controller.getMyProfile(user);
        Map<String, Object> result = response.getResult();

        assertEquals("admin", result.get("userId"));
        assertEquals("user@example.com", result.get("email"));
        verify(service).getMyProfile(user);
    }

    @Test
    void passwordChangeUsesTheAuthenticatedUser() throws Exception {
        ProfileSettingsService service = mock(ProfileSettingsService.class);
        ProfileSettingsApiController controller = new ProfileSettingsApiController(
                new ResultVoHelper(), service);
        LoginVO user = authenticatedUser();
        PasswordChangeRequestVO request = new PasswordChangeRequestVO();

        controller.changeMyPassword(request, user);

        verify(service).changeMyPassword(user, request);
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(7L);
        user.setId("admin");
        return user;
    }
}
