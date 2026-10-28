package egovframework.let.system.menus.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.menus.domain.model.SystemMenuSaveRequestVO;
import egovframework.let.system.menus.domain.model.SystemMenuVO;
import egovframework.let.system.menus.service.SystemMenuService;

@ExtendWith(MockitoExtension.class)
class SystemMenuTenantValidationApiControllerTest {

    @Mock
    private SystemMenuService systemMenuService;

    private MockMvc mockMvc;
    private UsernamePasswordAuthenticationToken adminAuthentication;

    @BeforeEach
    void setUp() {
        SystemMenuApiController controller = new SystemMenuApiController(new ResultVoHelper(), systemMenuService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalResolver())
                .build();
        LoginVO user = new LoginVO();
        user.setTenantId(1L);
        user.setRoleCode("PLATFORM_ADMIN");
        adminAuthentication = new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
    }

    @Test
    void createMenuReturnsBadRequestForInvalidModule() throws Exception {
        doThrow(new IllegalArgumentException("유효하지 않은 모듈입니다."))
                .when(systemMenuService).createMenu(eq(1L), any(SystemMenuSaveRequestVO.class));

        mockMvc.perform(post("/api/v1/system/menus")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"moduleId\":10,\"menuCode\":\"MENU_CODE\",\"menuNm\":\"메뉴\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value(900))
                .andExpect(jsonPath("$.resultMessage").value(ResponseCode.INPUT_CHECK_ERROR.getMessage()))
                .andExpect(jsonPath("$.result.message").value("유효하지 않은 모듈입니다."));
    }

            @Test
            void updateMenuReturnsBadRequestForInvalidExistingModuleOwnership() throws Exception {
            doThrow(new IllegalArgumentException("유효하지 않은 모듈입니다."))
                .when(systemMenuService).updateMenu(eq(1L), eq(11L), any(SystemMenuSaveRequestVO.class));

            mockMvc.perform(put("/api/v1/system/menus/11")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"menuNm\":\"메뉴\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.resultCode").value(900))
                .andExpect(jsonPath("$.resultMessage").value(ResponseCode.INPUT_CHECK_ERROR.getMessage()))
                .andExpect(jsonPath("$.result.message").value("유효하지 않은 모듈입니다."));
            }

            @Test
            void createMenuReturnsCreatedForValidMenu() throws Exception {
            SystemMenuVO menu = new SystemMenuVO();
            menu.setMenuId(11L);
            when(systemMenuService.createMenu(eq(1L), any(SystemMenuSaveRequestVO.class))).thenReturn(menu);

            mockMvc.perform(post("/api/v1/system/menus")
                .principal(adminAuthentication)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"moduleId\":10,\"menuCode\":\"MENU_CODE\",\"menuNm\":\"메뉴\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.menuId").value(11))
                .andExpect(jsonPath("$.result.message").value("메뉴가 성공적으로 등록되었습니다."));
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