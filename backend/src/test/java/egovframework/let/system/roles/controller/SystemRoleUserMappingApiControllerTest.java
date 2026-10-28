package egovframework.let.system.roles.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Collections;

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
import egovframework.let.system.roles.domain.model.SystemRoleUserAssignRequestVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserMapListVO;
import egovframework.let.system.roles.domain.model.SystemRoleUserVO;
import egovframework.let.system.roles.service.SystemRoleService;

@ExtendWith(MockitoExtension.class)
class SystemRoleUserMappingApiControllerTest {

    @Mock
    private SystemRoleService systemRoleService;

    private MockMvc mockMvc;
    private UsernamePasswordAuthenticationToken adminAuthentication;
    private UsernamePasswordAuthenticationToken userAuthentication;

    @BeforeEach
    void setUp() {
        SystemRoleApiController controller = new SystemRoleApiController(new egovframework.com.cmm.util.ResultVoHelper(), systemRoleService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();

        adminAuthentication = authenticationFor("PLATFORM_ADMIN");
        userAuthentication = authenticationFor("TENANT_USER");
    }

    @Test
    void listRoleUsersReturnsAssignedAndUnassignedForAdmin() throws Exception {
        SystemRoleUserVO assigned = new SystemRoleUserVO();
        assigned.setLoginId(101L);
        assigned.setUserNm("관리자");
        assigned.setDepartmentNm("운영팀");
        assigned.setAssigned(true);

        SystemRoleUserVO unassigned = new SystemRoleUserVO();
        unassigned.setLoginId(202L);
        unassigned.setUserNm("홍길동");
        unassigned.setDepartmentNm("영업팀");
        unassigned.setAssigned(false);

        SystemRoleUserMapListVO mapList = new SystemRoleUserMapListVO(
                Arrays.asList(assigned),
                Arrays.asList(unassigned));

        when(systemRoleService.listRoleUsers(1L, 2L)).thenReturn(mapList);

        mockMvc.perform(get("/api/v1/system/roles/2/users")
                .principal(adminAuthentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.assignedUsers[0].loginId").value(101))
                .andExpect(jsonPath("$.result.assignedUsers[0].assigned").value(true))
                .andExpect(jsonPath("$.result.unassignedUsers[0].loginId").value(202))
                .andExpect(jsonPath("$.result.unassignedUsers[0].assigned").value(false));
    }

    @Test
    void assignUserToRoleAcceptsLoginIdAndPersistsMapping() throws Exception {
        SystemRoleUserVO mappedUser = new SystemRoleUserVO();
        mappedUser.setLoginId(101L);
        mappedUser.setUserNm("관리자");
        mappedUser.setAssigned(true);

        when(systemRoleService.assignUserToRole(eq(1L), eq(2L), any(SystemRoleUserAssignRequestVO.class)))
                .thenReturn(mappedUser);

        mockMvc.perform(post("/api/v1/system/roles/2/users")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"loginId\":101}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.loginId").value(101))
                .andExpect(jsonPath("$.result.item.assigned").value(true));
    }

    @Test
    void assignUserToRoleReturnsFriendlyMessageWhenMappingFails() throws Exception {
        when(systemRoleService.assignUserToRole(eq(1L), eq(2L), any(SystemRoleUserAssignRequestVO.class)))
                .thenThrow(new RuntimeException("권한 사용자 매핑 저장 중 오류가 발생했습니다."));

        mockMvc.perform(post("/api/v1/system/roles/2/users")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"loginId\":101}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value(900))
                .andExpect(jsonPath("$.result.message").value("권한 사용자 매핑 저장 중 오류가 발생했습니다."));
    }

    @Test
    void removeUserFromRoleRejectsNonAdmin() throws Exception {
        mockMvc.perform(delete("/api/v1/system/roles/2/users/101")
                .principal(userAuthentication))
                .andExpect(status().isForbidden());
    }

    @Test
    void removeUserFromRoleReturnsSuccessForAdmin() throws Exception {
        when(systemRoleService.removeUserFromRole(1L, 2L, 101L)).thenReturn(true);

        mockMvc.perform(delete("/api/v1/system/roles/2/users/101")
                .principal(adminAuthentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.message").value("권한 사용자 매핑이 삭제되었습니다."));
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
