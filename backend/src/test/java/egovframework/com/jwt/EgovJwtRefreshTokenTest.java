package egovframework.com.jwt;

import egovframework.com.cmm.LoginVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EgovJwtRefreshTokenTest {

    private final EgovJwtTokenUtil jwtTokenUtil = new EgovJwtTokenUtil();

    @DisplayName("리프레쉬 토큰이 올바르게 생성되고 검증된다")
    @Test
    void testRefreshTokenGeneration() {
        // given
        LoginVO loginVO = new LoginVO();
        loginVO.setId("testUser");
        loginVO.setName("Test User");
        loginVO.setUserSe("USER");
        loginVO.setOrgnztId("testOrg");
        loginVO.setUniqId("testUniqId");
        loginVO.setGroupNm("ROLE_USER");

        // when
        String refreshToken = jwtTokenUtil.generateRefreshToken(loginVO);

        // then
        assertNotNull(refreshToken);
        assertTrue(jwtTokenUtil.isValidRefreshToken(refreshToken));
        
        // 리프레쉬 토큰에서 사용자 정보 추출 가능한지 확인
        LoginVO extractedLoginVO = jwtTokenUtil.getLoginVOFromToken(refreshToken);
        assertEquals("testUser", extractedLoginVO.getId());
        assertEquals("Test User", extractedLoginVO.getName());
    }

    @DisplayName("일반 액세스 토큰은 리프레쉬 토큰으로 검증되지 않는다")
    @Test
    void testAccessTokenIsNotValidRefreshToken() {
        // given
        LoginVO loginVO = new LoginVO();
        loginVO.setId("testUser");
        loginVO.setName("Test User");
        loginVO.setUserSe("USER");
        loginVO.setOrgnztId("testOrg");
        loginVO.setUniqId("testUniqId");
        loginVO.setGroupNm("ROLE_USER");

        // when
        String accessToken = jwtTokenUtil.generateToken(loginVO);

        // then
        assertNotNull(accessToken);
        assertFalse(jwtTokenUtil.isValidRefreshToken(accessToken));
    }

    @DisplayName("잘못된 토큰은 리프레쉬 토큰으로 검증되지 않는다")
    @Test
    void testInvalidTokenIsNotValidRefreshToken() {
        // given
        String invalidToken = "invalid.refresh.token";

        // when & then
        assertFalse(jwtTokenUtil.isValidRefreshToken(invalidToken));
    }
}