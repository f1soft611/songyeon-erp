package egovframework.let.system.permissions.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.core.MethodParameter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.permissions.domain.model.SystemPermissionVO;
import egovframework.let.system.permissions.service.SystemPermissionService;

@ExtendWith(MockitoExtension.class)
class SystemPermissionApiControllerTest {

    @Mock
    private SystemPermissionService systemPermissionService;

    private MockMvc mockMvc;
    private UsernamePasswordAuthenticationToken adminAuthentication;
    private UsernamePasswordAuthenticationToken userAuthentication;

    @BeforeEach
    void setUp() {
        SystemPermissionApiController controller = new SystemPermissionApiController(
                new ResultVoHelper(), systemPermissionService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
            .build();
        adminAuthentication = authenticationFor("PLATFORM_ADMIN");
        userAuthentication = authenticationFor("TENANT_USER");
    }

    @Test
        void listPermissionsReturnsCompleteActivePermissionObjectsInSortOrderForAdmin() throws Exception {
        when(systemPermissionService.listActivePermissions()).thenReturn(Arrays.asList(
                new SystemPermissionVO(1L, "READ", "조회", 10),
            new SystemPermissionVO(3L, "CREATE", "등록", 20),
            new SystemPermissionVO(5L, "EXCEL", "엑셀", 20)));

        mockMvc.perform(get("/api/v1/system/permissions").principal(adminAuthentication))
                .andExpect(status().isOk())
            .andExpect(jsonPath("$.result.resultList.length()").value(3))
            .andExpect(jsonPath("$.result.resultList[0].permissionId").value(1))
            .andExpect(jsonPath("$.result.resultList[0].permissionCode").value("READ"))
            .andExpect(jsonPath("$.result.resultList[0].permissionName").value("조회"))
            .andExpect(jsonPath("$.result.resultList[0].sortOrder").value(10))
            .andExpect(jsonPath("$.result.resultList[1].permissionId").value(3))
            .andExpect(jsonPath("$.result.resultList[1].permissionCode").value("CREATE"))
            .andExpect(jsonPath("$.result.resultList[1].permissionName").value("등록"))
            .andExpect(jsonPath("$.result.resultList[1].sortOrder").value(20))
            .andExpect(jsonPath("$.result.resultList[2].permissionId").value(5))
            .andExpect(jsonPath("$.result.resultList[2].permissionCode").value("EXCEL"))
            .andExpect(jsonPath("$.result.resultList[2].permissionName").value("엑셀"))
            .andExpect(jsonPath("$.result.resultList[2].sortOrder").value(20));
    }

    @Test
    void listPermissionsRejectsNonAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/system/permissions").principal(userAuthentication))
                .andExpect(status().isForbidden());
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