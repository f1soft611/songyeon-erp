package egovframework.let.system.menus.controller;

import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.menus.domain.model.SystemMenuPermissionSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.service.SystemMenuService;

@ExtendWith(MockitoExtension.class)
class SystemMenuPermissionApiControllerTest {

    @Mock
    private SystemMenuService systemMenuService;

    private MockMvc mockMvc;
    private UsernamePasswordAuthenticationToken adminAuthentication;
    private UsernamePasswordAuthenticationToken userAuthentication;

    @BeforeEach
    void setUp() {
        SystemMenuApiController controller = new SystemMenuApiController(new ResultVoHelper(), systemMenuService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
        adminAuthentication = authenticationFor("PLATFORM_ADMIN");
        userAuthentication = authenticationFor("TENANT_USER");
    }

    @Test
    void replaceMenuPermissionsRejectsNonAdmin() throws Exception {
        mockMvc.perform(put("/api/v1/system/menus/11/permissions")
                .principal(userAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"permissionCodes\":[\"READ\"]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void replaceMenuPermissionsReturnsSavedCodesForAdmin() throws Exception {
        SystemMenuVO menu = new SystemMenuVO();
        menu.setMenuId(11L);
        menu.setPermissionCodes(Arrays.asList("READ", "CREATE"));
        when(systemMenuService.replaceMenuPermissions(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(11L),
                org.mockito.ArgumentMatchers.any(SystemMenuPermissionSaveRequestVO.class))).thenReturn(menu);

        mockMvc.perform(put("/api/v1/system/menus/11/permissions")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"permissionCodes\":[\"READ\",\"CREATE\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.menuId").value(11))
                .andExpect(jsonPath("$.result.item.permissionCodes[0]").value("READ"))
                .andExpect(jsonPath("$.result.item.permissionCodes[1]").value("CREATE"));
    }

            @Test
            void replaceMenuPermissionsReturnsBadRequestForGroupMenu() throws Exception {
            when(systemMenuService.replaceMenuPermissions(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(11L),
                org.mockito.ArgumentMatchers.any(SystemMenuPermissionSaveRequestVO.class)))
                .thenThrow(new IllegalArgumentException("하위 메뉴가 있는 메뉴에는 버튼 권한을 설정할 수 없습니다."));

            mockMvc.perform(put("/api/v1/system/menus/11/permissions")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"permissionCodes\":[\"READ\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value(900))
                .andExpect(jsonPath("$.resultMessage").value(ResponseCode.INPUT_CHECK_ERROR.getMessage()))
                .andExpect(jsonPath("$.result.message")
                    .value("하위 메뉴가 있는 메뉴에는 버튼 권한을 설정할 수 없습니다."));
            }

            @Test
            void replaceMenuPermissionsReturnsBadRequestForInvalidPermissionCode() throws Exception {
            when(systemMenuService.replaceMenuPermissions(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(11L),
                org.mockito.ArgumentMatchers.any(SystemMenuPermissionSaveRequestVO.class)))
                .thenThrow(new IllegalArgumentException("유효하지 않은 권한 코드입니다."));

            mockMvc.perform(put("/api/v1/system/menus/11/permissions")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"permissionCodes\":[\"UNKNOWN\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value(900))
                .andExpect(jsonPath("$.resultMessage").value(ResponseCode.INPUT_CHECK_ERROR.getMessage()))
                .andExpect(jsonPath("$.result.message").value("유효하지 않은 권한 코드입니다."));
            }

    @Test
    void listMenusReturnsPermissionCodesForRequestedModule() throws Exception {
        SystemMenuVO menu = new SystemMenuVO();
        menu.setMenuId(11L);
        menu.setPermissionCodes(Arrays.asList("READ", "EXCEL"));
        when(systemMenuService.listMenus(eq(1L), eq(2L))).thenReturn(Collections.singletonList(menu));

        mockMvc.perform(get("/api/v1/system/menus")
                .param("moduleId", "2")
                .principal(adminAuthentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultList[0].menuId").value(11))
                .andExpect(jsonPath("$.result.resultList[0].permissionCodes[0]").value("READ"))
                .andExpect(jsonPath("$.result.resultList[0].permissionCodes[1]").value("EXCEL"));

        verify(systemMenuService).listMenus(1L, 2L);
    }

    private UsernamePasswordAuthenticationToken authenticationFor(String roleCode) {
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setRoleCode(roleCode);
        return new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    private static class AuthenticationPrincipalResolver implements HandlerMethodArgumentResolver {

        @Override
        public boolean supportsParameter(MethodParameter parameter) {
            return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
        }

        @Override
        public Object resolveArgument(
                MethodParameter parameter,
                ModelAndViewContainer modelAndViewContainer,
                NativeWebRequest webRequest,
                org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
            return ((UsernamePasswordAuthenticationToken) webRequest.getUserPrincipal()).getPrincipal();
        }
    }
}