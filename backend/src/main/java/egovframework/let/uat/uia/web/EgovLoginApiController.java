package egovframework.let.uat.uia.web;

import java.util.HashMap;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.EgovMessageSource;
import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.jwt.EgovJwtTokenUtil;
import egovframework.let.pu.documents.service.DocumentUnlockStore;
import egovframework.let.uat.uia.service.EgovLoginService;
import egovframework.let.uat.uia.service.impl.LoginAttemptLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@Tag(name = "EgovLoginApiController", description = "로그인 관련")
public class EgovLoginApiController {

    @Resource(name = "loginService")
    private EgovLoginService loginService;

    @Resource(name = "egovMessageSource")
    private EgovMessageSource egovMessageSource;

    @Resource(name = "propertiesService")
    protected EgovPropertyService propertiesService;

    @Resource(name = "leaveaTrace")
    private LeaveaTrace leaveaTrace;

    @Autowired
    private EgovJwtTokenUtil jwtTokenUtil;

    @Resource(name = "loginAttemptLimiter")
    private LoginAttemptLimiter loginAttemptLimiter;

    // 문서함에서 비밀번호로 열어둔 폴더(송연은 로그아웃할 때까지 열려 있었다)
    @Resource(name = "documentUnlockStore")
    private DocumentUnlockStore documentUnlockStore;

    /** 로그인 uniqId(tb_user 번호) → 사번. 문서함 잠금은 사번으로 열었다(2026-10-22) */
    @Resource(name = "loginEmployeeResolver")
    private LoginEmployeeResolver loginEmployeeResolver;

    @Operation(summary = "일반 로그인", description = "일반 로그인 처리", tags = {"EgovLoginApiController"})
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "로그인 성공"),
        @ApiResponse(responseCode = "300", description = "로그인 실패")
    })
    @PostMapping(value = "/auth/login", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_HTML_VALUE})
    public HashMap<String, Object> actionLogin(@RequestBody LoginVO loginVO, HttpServletRequest request) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();

        LoginVO loginResultVO = loginService.actionLogin(loginVO);
        if (loginResultVO != null && loginResultVO.getId() != null && !"".equals(loginResultVO.getId())) {
            request.getSession().setAttribute("LoginVO", loginResultVO);
            resultMap.put("resultVO", loginResultVO);
            resultMap.put("resultCode", "200");
            resultMap.put("resultMessage", "성공 !!!");
        } else {
            resultMap.put("resultVO", loginResultVO);
            resultMap.put("resultCode", "300");
            resultMap.put("resultMessage", egovMessageSource.getMessage("fail.common.login"));
        }
        return resultMap;
    }

    @Operation(summary = "JWT 로그인", description = "JWT 로그인 처리", tags = {"EgovLoginApiController"})
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "로그인 성공"),
        @ApiResponse(responseCode = "300", description = "로그인 실패")
    })
    @PostMapping(value = "/auth/login-jwt")
    public HashMap<String, Object> actionLoginJWT(@RequestBody LoginVO loginVO, HttpServletRequest request, ModelMap model) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();

        // 송연과 같은 로그인 시도 제한 (IP 기준)
        String clientIp = request.getRemoteAddr();
        int lockedSeconds = loginAttemptLimiter.remaining(clientIp);
        if (lockedSeconds > 0) {
            resultMap.put("resultCode", "429");
            resultMap.put("resultMessage", "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
            resultMap.put("lockedSeconds", lockedSeconds);
            return resultMap;
        }

        LoginVO loginResultVO = loginService.actionLogin(loginVO);
        if (loginResultVO != null && loginResultVO.getId() != null && !loginResultVO.getId().equals("")) {
            loginAttemptLimiter.succeeded(clientIp);
            String jwtToken = jwtTokenUtil.generateToken(loginResultVO);
            String refreshToken = jwtTokenUtil.generateRefreshToken(loginResultVO);
            request.getSession().setAttribute("LoginVO", loginResultVO);
            resultMap.put("resultVO", loginResultVO);
            resultMap.put("jToken", jwtToken);
            resultMap.put("refreshToken", refreshToken);
            resultMap.put("resultCode", "200");
            resultMap.put("resultMessage", "성공 !!!");
        } else {
            loginAttemptLimiter.failed(clientIp);
            resultMap.put("resultVO", loginResultVO);
            resultMap.put("resultCode", "300");
            resultMap.put("resultMessage", egovMessageSource.getMessage("fail.common.login"));
        }
        return resultMap;
    }

    @Operation(summary = "플랫폼 관리자 JWT 로그인", description = "플랫폼 관리자 계정만 로그인할 수 있는 JWT 로그인 처리", tags = {"EgovLoginApiController"})
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "로그인 성공"),
        @ApiResponse(responseCode = "300", description = "로그인 실패")
    })
    @PostMapping(value = "/auth/login-jwt/admin")
    public HashMap<String, Object> actionLoginAdminJWT(@RequestBody LoginVO loginVO, HttpServletRequest request) throws Exception {
        HashMap<String, Object> resultMap = new HashMap<>();

        LoginVO loginResultVO = loginService.actionLogin(loginVO);
        if (loginResultVO != null && loginResultVO.getId() != null && !"".equals(loginResultVO.getId())) {
            String jwtToken = jwtTokenUtil.generateToken(loginResultVO);
            String refreshToken = jwtTokenUtil.generateRefreshToken(loginResultVO);
            request.getSession().setAttribute("LoginVO", loginResultVO);
            resultMap.put("resultVO", loginResultVO);
            resultMap.put("jToken", jwtToken);
            resultMap.put("refreshToken", refreshToken);
            resultMap.put("resultCode", "200");
            resultMap.put("resultMessage", "성공 !!!");
        } else {
            resultMap.put("resultVO", loginResultVO);
            resultMap.put("resultCode", "300");
            resultMap.put("resultMessage", egovMessageSource.getMessage("fail.common.login"));
        }
        return resultMap;
    }

    @Operation(summary = "JWT 토큰 리프레쉬", description = "리프레쉬 토큰을 사용하여 새로운 액세스 토큰을 발급받습니다", tags = {"EgovLoginApiController"})
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "토큰 리프레쉬 성공"),
        @ApiResponse(responseCode = "401", description = "리프레쉬 토큰이 유효하지 않음")
    })
    @PostMapping(value = "/auth/refresh")
    public HashMap<String, Object> refreshToken(@RequestBody HashMap<String, String> request) {
        HashMap<String, Object> resultMap = new HashMap<>();
        String refreshToken = request.get("refreshToken");

        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            resultMap.put("resultCode", "401");
            resultMap.put("resultMessage", "리프레쉬 토큰이 제공되지 않았습니다");
            return resultMap;
        }

        if (!jwtTokenUtil.isValidRefreshToken(refreshToken)) {
            resultMap.put("resultCode", "401");
            resultMap.put("resultMessage", "유효하지 않은 리프레쉬 토큰입니다");
            return resultMap;
        }

        try {
            LoginVO loginVO = jwtTokenUtil.getLoginVOFromToken(refreshToken);
            if (loginVO == null) {
                resultMap.put("resultCode", "401");
                resultMap.put("resultMessage", "토큰에서 사용자 정보를 추출할 수 없습니다");
                return resultMap;
            }

            String newAccessToken = jwtTokenUtil.generateToken(loginVO);
            resultMap.put("jToken", newAccessToken);
            resultMap.put("resultCode", "200");
            resultMap.put("resultMessage", "토큰 리프레쉬 성공");
        } catch (Exception e) {
            log.error("토큰 리프레쉬 실패: " + e.getMessage(), e);
            resultMap.put("resultCode", "500");
            resultMap.put("resultMessage", "토큰 리프레쉬 실패");
        }
        return resultMap;
    }

    @Operation(summary = "로그아웃", description = "로그아웃 처리(JWT,일반 관계 없이)", security = {@SecurityRequirement(name = "Authorization")}, tags = {"EgovLoginApiController"})
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "로그아웃 성공")
    })
    @PostMapping(value = "/auth/logout")
    public ResultVO actionLogoutJSON(@RequestBody(required = false) HashMap<String, Object> params,
                                    @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user,
                                    HttpServletRequest request, HttpServletResponse response) throws Exception {
        ResultVO resultVO = new ResultVO();
        log.info("=== 로그아웃 시작 ===");
        // 문서함에서 열어둔 폴더를 다시 잠근다
        String employeeId = loginEmployeeResolver.employeeId(user);
        if (employeeId != null && !employeeId.isEmpty()) {
            documentUnlockStore.forget(employeeId);
        }
        new SecurityContextLogoutHandler().logout(request, response, null);
        resultVO.setResultCode(ResponseCode.SUCCESS.getCode());
        resultVO.setResultMessage(ResponseCode.SUCCESS.getMessage());
        return resultVO;
    }
}

