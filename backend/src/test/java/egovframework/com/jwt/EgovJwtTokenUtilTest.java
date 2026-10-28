package egovframework.com.jwt;

import egovframework.com.cmm.LoginVO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;

import static org.junit.jupiter.api.Assertions.*;

class EgovJwtTokenUtilTest {

    private final EgovJwtTokenUtil jwtTokenUtil = new EgovJwtTokenUtil();

    @DisplayName("올바른 토큰을 입력했을 때, LoginVO 객체를 반환한다.")
    @Test
    void testValidTokenReturnsLoginVO() {
        // given
        LoginVO loginVO = new LoginVO();
        loginVO.setId("testUser");
        loginVO.setName("Test User");
        loginVO.setEmail("test@example.com");
        loginVO.setProfileImage("/profile/test.png");
        loginVO.setDepartmentName("개발팀");
        loginVO.setLevelId(123L);
        loginVO.setLevelCode("001");
        loginVO.setLevelName("사원");
        loginVO.setUserSe("USER");
        loginVO.setOrgnztId("testOrg");
        loginVO.setUniqId("testUniqId");
        loginVO.setGroupNm("ROLE_USER");
        loginVO.setRoleCode("TENANT_USER");
        loginVO.setRoleId(101L);
        loginVO.setFactoryCode("FAC001");

        String token = jwtTokenUtil.generateToken(loginVO);

        // when
        LoginVO result = jwtTokenUtil.getLoginVOFromToken(token);

        // then
        assertNotNull(result);
        assertEquals("testUser", result.getId());
        assertEquals("Test User", result.getName());
        assertEquals("test@example.com", result.getEmail());
        assertNull(result.getProfileImage());
        assertEquals("개발팀", result.getDepartmentName());
        assertEquals(123L, result.getLevelId());
        assertEquals("001", result.getLevelCode());
        assertEquals("사원", result.getLevelName());
        assertEquals("USER", result.getUserSe());
        assertEquals("testOrg", result.getOrgnztId());
        assertEquals("testUniqId", result.getUniqId());
        assertEquals("ROLE_USER", result.getGroupNm());
        assertEquals("TENANT_USER", result.getRoleCode());
        assertEquals(101L, result.getRoleId());
        assertEquals("FAC001", result.getFactoryCode());
    }

    @DisplayName("잘못된 토큰을 입력했을 때, InvalidJwtException 예외가 발생한다.")
    @Test
    void testInvalidTokenReturnsThrowException() {
        // given
        String token = "invalidToken";

        // when
        // then
        assertThrows(InvalidJwtException.class, () -> {
            jwtTokenUtil.getLoginVOFromToken(token);
        });
    }

    @DisplayName("Id가 포함되지 않은 토큰을 입력했을 때, InvalidJwtException 예외가 발생한다.")
    @Test
    void testTokenWithoutIdReturnsThrowException() {
        // given
        LoginVO loginVO = new LoginVO();
        String token = jwtTokenUtil.generateToken(loginVO);

        // when
        // then
        assertThrows(InvalidJwtException.class, () -> {
            jwtTokenUtil.getLoginVOFromToken(token);
        });
    }

    @DisplayName("프로필 이미지 본문은 JWT claims에 포함하지 않는다.")
    @Test
    void testProfileImageIsNotStoredInTokenClaims() {
        LoginVO loginVO = new LoginVO();
        loginVO.setId("testUser");
        loginVO.setProfileImage("data:image/png;base64," + repeat('A', 200000));

        String token = jwtTokenUtil.generateToken(loginVO);
        LoginVO result = jwtTokenUtil.getLoginVOFromToken(token);

        assertNull(result.getProfileImage());
        assertTrue(token.length() < 5000);
    }

    private static String repeat(char value, int count) {
        StringBuilder builder = new StringBuilder(count);
        for (int index = 0; index < count; index++) {
            builder.append(value);
        }
        return builder.toString();
    }
}
