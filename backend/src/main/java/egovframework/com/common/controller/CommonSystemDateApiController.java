package egovframework.com.common.controller;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.utl.fcc.service.EgovDateUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "CommonSystemDateApiController", description = "공통 시스템 날짜 API")
public class CommonSystemDateApiController {

    private final ResultVoHelper resultVoHelper;

    public CommonSystemDateApiController(ResultVoHelper resultVoHelper) {
        this.resultVoHelper = resultVoHelper;
    }

    @Operation(summary = "공통 시스템 날짜 조회", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/common/system-date")
    public ResultVO getSystemDate(@AuthenticationPrincipal LoginVO user) {
        requireAuthenticated(user);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put(
                "today",
                LocalDate.parse(EgovDateUtil.getToday(), DateTimeFormatter.BASIC_ISO_DATE).toString());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }
}
