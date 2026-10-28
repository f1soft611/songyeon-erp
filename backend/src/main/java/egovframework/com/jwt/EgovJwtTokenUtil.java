package egovframework.com.jwt;

import java.io.Serializable;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureException;
import io.jsonwebtoken.UnsupportedJwtException;
import org.springframework.stereotype.Component;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.service.EgovProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.extern.slf4j.Slf4j;

//security 관련 제외한 jwt util 클래스
@Slf4j
@Component
public class EgovJwtTokenUtil implements Serializable{

	private static final long serialVersionUID = -5180902194184255251L;
	//public static final long JWT_TOKEN_VALIDITY = 24 * 60 * 60; //하루
	public static final long JWT_TOKEN_VALIDITY = 15 * 60; //액세스 토큰 유효시간, 15분
	public static final long JWT_REFRESH_TOKEN_VALIDITY = 7 * 24 * 60 * 60; //리프레쉬 토큰 유효시간, 7일
	
	public static final String SECRET_KEY = EgovProperties.getProperty("Globals.jwt.secret");
  
	// retrieve username from jwt token
	public String getUserIdFromToken(String token) {
		return getInfoFromToken("id", token);
	}

	public String getUserSeFromToken(String token) {
		return getInfoFromToken("userSe", token);
	}

	public String getRoleCodeFromToken(String token) {
		return getInfoFromToken("roleCode", token);
	}

	public String getInfoFromToken(String type, String token) {
		Claims claims = getClaimFromToken(token);
	    Object info = claims.get(type);

	    return info != null ? info.toString() : null;
	}

	public Claims getClaimFromToken(String token) {
		final Claims claims = getAllClaimsFromToken(token);
		return claims;
	}

	//for retrieveing any information from token we will need the secret key
	public Claims getAllClaimsFromToken(String token) {
		log.debug("===>>> secret = "+SECRET_KEY);
		return Jwts.parser().setSigningKey(SECRET_KEY).parseClaimsJws(token).getBody();
	}

	//generate token for user
    public String generateToken(LoginVO loginVO) {
        return doGenerateToken(loginVO, "Authorization");
    }

	//generate refresh token for user
    public String generateRefreshToken(LoginVO loginVO) {
        return doGenerateRefreshToken(loginVO, "Refresh");
    }

	//while creating the token -
	//1. Define  claims of the token, like Issuer, Expiration, Subject, and the ID
	//2. Sign the JWT using the HS512 algorithm and secret key.
	//3. According to JWS Compact Serialization(https://tools.ietf.org/html/draft-ietf-jose-json-web-signature-41#section-3.1)
	//   compaction of the JWT to a URL-safe string
	private String doGenerateToken(LoginVO loginVO, String subject) {
		
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", loginVO.getId() );
        claims.put("name", loginVO.getName() );
		claims.put("email", loginVO.getEmail() );
		claims.put("departmentName", loginVO.getDepartmentName() );
		claims.put("levelId", loginVO.getLevelId() );
		claims.put("levelCode", loginVO.getLevelCode() );
		claims.put("levelName", loginVO.getLevelName() );
        claims.put("userSe", loginVO.getUserSe() );
        claims.put("orgnztId", loginVO.getOrgnztId() );
        claims.put("uniqId", loginVO.getUniqId() );
        claims.put("type", subject);
        claims.put("groupNm", loginVO.getGroupNm());//권한그룹으로 시프링시큐리티 사용
        claims.put("roleCode", loginVO.getRoleCode());//역할코드로 3역할 구분
		claims.put("roleId", loginVO.getRoleId());//역할 ID
		claims.put("tenantCode", loginVO.getTenantCode());//테넌트 코드
		claims.put("tenantId", loginVO.getTenantId());//테넌트 ID

    	log.debug("===>>> secret = "+SECRET_KEY);
        return Jwts.builder().setClaims(claims).setSubject(subject).setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + JWT_TOKEN_VALIDITY * 1000))
            .signWith(SignatureAlgorithm.HS512, SECRET_KEY).compact();
    }

	//generate refresh token with longer validity
	private String doGenerateRefreshToken(LoginVO loginVO, String subject) {
		
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", loginVO.getId() );
        claims.put("name", loginVO.getName() );
		claims.put("email", loginVO.getEmail() );
		claims.put("departmentName", loginVO.getDepartmentName() );
		claims.put("levelId", loginVO.getLevelId() );
		claims.put("levelCode", loginVO.getLevelCode() );
		claims.put("levelName", loginVO.getLevelName() );
        claims.put("userSe", loginVO.getUserSe() );
        claims.put("orgnztId", loginVO.getOrgnztId() );
        claims.put("uniqId", loginVO.getUniqId() );
        claims.put("type", subject);
        claims.put("groupNm", loginVO.getGroupNm());//권한그룹으로 시프링시큐리티 사용
        claims.put("roleCode", loginVO.getRoleCode());//역할코드로 3역할 구분
		claims.put("roleId", loginVO.getRoleId());//역할 ID
		claims.put("tenantCode", loginVO.getTenantCode());//테넌트 코드
		claims.put("tenantId", loginVO.getTenantId());//테넌트 ID

    	log.debug("===>>> refresh token secret = "+SECRET_KEY);
        return Jwts.builder().setClaims(claims).setSubject(subject).setIssuedAt(new Date(System.currentTimeMillis()))
            .setExpiration(new Date(System.currentTimeMillis() + JWT_REFRESH_TOKEN_VALIDITY * 1000))
            .signWith(SignatureAlgorithm.HS512, SECRET_KEY).compact();
    }

	public LoginVO getLoginVOFromToken(String token) throws InvalidJwtException{
		LoginVO loginVO = new LoginVO();

        try {
		    loginVO.setId(getUserIdFromToken(token));
			loginVO.setName(getInfoFromToken("name", token));
			loginVO.setEmail(getInfoFromToken("email", token));
			loginVO.setDepartmentName(getInfoFromToken("departmentName", token));
			loginVO.setLevelCode(getInfoFromToken("levelCode", token));
			loginVO.setLevelName(getInfoFromToken("levelName", token));
			Object levelIdValue = getClaimFromToken(token).get("levelId");
			if (levelIdValue instanceof Number) {
				loginVO.setLevelId(((Number) levelIdValue).longValue());
			} else if (levelIdValue instanceof String) {
				String levelIdText = ((String) levelIdValue).trim();
				if (!levelIdText.isEmpty()) {
					loginVO.setLevelId(Long.valueOf(levelIdText));
				}
			}
			loginVO.setUserSe(getUserSeFromToken(token));
			loginVO.setOrgnztId(getInfoFromToken("orgnztId", token));
			loginVO.setUniqId(getInfoFromToken("uniqId", token));
            loginVO.setGroupNm(getInfoFromToken("groupNm", token));
            loginVO.setRoleCode(getRoleCodeFromToken(token));
			Object roleIdValue = getClaimFromToken(token).get("roleId");
			if (roleIdValue instanceof Number) {
				loginVO.setRoleId(((Number) roleIdValue).longValue());
			} else if (roleIdValue instanceof String) {
				String roleIdText = ((String) roleIdValue).trim();
				if (!roleIdText.isEmpty()) {
					loginVO.setRoleId(Long.valueOf(roleIdText));
				}
			}
			String tenantCode = getInfoFromToken("tenantCode", token);
			if (tenantCode == null) {
				tenantCode = getInfoFromToken("factoryCode", token);
			}
			loginVO.setTenantCode(tenantCode);

			Object tenantIdValue = getClaimFromToken(token).get("tenantId");
			if (tenantIdValue instanceof Number) {
				loginVO.setTenantId(((Number) tenantIdValue).longValue());
			} else if (tenantIdValue instanceof String) {
				String tenantIdText = ((String) tenantIdValue).trim();
				if (!tenantIdText.isEmpty()) {
					loginVO.setTenantId(Long.valueOf(tenantIdText));
				}
			}

            if(loginVO.getId() == null) throw new InvalidJwtException("Missing id in token");
        } catch (IllegalArgumentException | ExpiredJwtException |
                 MalformedJwtException | UnsupportedJwtException |
                 SignatureException e) {
            throw new InvalidJwtException("Unable to verify JWT Token: " + e.getMessage());
        }

		return loginVO;
	}

	//validate refresh token and return true if valid
	public boolean isValidRefreshToken(String token) {
		try {
			Claims claims = getAllClaimsFromToken(token);
			String type = claims.get("type", String.class);
			return "Refresh".equals(type) && !isTokenExpired(token);
		} catch (Exception e) {
			log.debug("Invalid refresh token: " + e.getMessage());
			return false;
		}
	}

	//check if token is expired
	private boolean isTokenExpired(String token) {
		try {
			Date expiration = getAllClaimsFromToken(token).getExpiration();
			return expiration.before(new Date());
		} catch (Exception e) {
			return true;
		}
	}
}
