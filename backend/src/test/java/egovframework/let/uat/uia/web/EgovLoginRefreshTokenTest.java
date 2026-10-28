package egovframework.let.uat.uia.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.com.cmm.LoginVO;
import egovframework.com.jwt.EgovJwtTokenUtil;
import egovframework.let.uat.uia.service.EgovLoginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Disabled("테스트 비활성화")
@WebMvcTest(EgovLoginApiController.class)
class EgovLoginRefreshTokenTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EgovLoginService loginService;

    @MockBean
    private EgovJwtTokenUtil jwtTokenUtil;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @DisplayName("유효한 리프레쉬 토큰으로 새로운 액세스 토큰을 받을 수 있다")
    @Test
    void testRefreshTokenSuccess() throws Exception {
        // given
        String refreshToken = "valid.refresh.token";
        String newAccessToken = "new.access.token";
        
        LoginVO loginVO = new LoginVO();
        loginVO.setId("admin");
        loginVO.setName("Test User");
        
        HashMap<String, String> request = new HashMap<>();
        request.put("refreshToken", refreshToken);

        when(jwtTokenUtil.isValidRefreshToken(refreshToken)).thenReturn(true);
        when(jwtTokenUtil.getLoginVOFromToken(refreshToken)).thenReturn(loginVO);
        when(jwtTokenUtil.generateToken(any(LoginVO.class))).thenReturn(newAccessToken);

        // when & then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("200"))
                .andExpect(jsonPath("$.jToken").value(newAccessToken))
                .andExpect(jsonPath("$.resultMessage").value("토큰 리프레쉬 성공"));
    }

    @DisplayName("유효하지 않은 리프레쉬 토큰은 거부된다")
    @Test
    void testRefreshTokenFailure() throws Exception {
        // given
        String invalidRefreshToken = "invalid.refresh.token";
        
        HashMap<String, String> request = new HashMap<>();
        request.put("refreshToken", invalidRefreshToken);

        when(jwtTokenUtil.isValidRefreshToken(invalidRefreshToken)).thenReturn(false);

        // when & then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("401"))
                .andExpect(jsonPath("$.resultMessage").value("유효하지 않은 리프레쉬 토큰입니다"));
    }

    @DisplayName("리프레쉬 토큰이 없으면 거부된다")
    @Test
    void testRefreshTokenMissing() throws Exception {
        // given
        HashMap<String, String> request = new HashMap<>();
        // refreshToken을 포함하지 않음

        // when & then
        mockMvc.perform(post("/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultCode").value("401"))
                .andExpect(jsonPath("$.resultMessage").value("유효하지 않은 리프레쉬 토큰입니다"));
    }
}