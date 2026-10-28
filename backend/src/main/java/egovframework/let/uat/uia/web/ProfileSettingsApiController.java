package egovframework.let.uat.uia.web;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.uat.uia.domain.model.MyProfileUpdateRequestVO;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;
import egovframework.let.uat.uia.service.ProfileSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me")
@Tag(name = "ProfileSettingsApiController", description = "내 정보 및 보안 설정")
public class ProfileSettingsApiController {

    private final ResultVoHelper resultVoHelper;
    private final ProfileSettingsService profileSettingsService;

    @GetMapping("/profile")
    @Operation(summary = "내 프로필 조회", security = { @SecurityRequirement(name = "Authorization") })
    public ResultVO getMyProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        MyProfileVO profile = profileSettingsService.getMyProfile(user);
        if (profile == null) {
            Map<String, Object> result = new HashMap<String, Object>();
            result.put("message", "로그인한 계정 정보를 찾을 수 없습니다.");
            return resultVoHelper.buildFromMap(result, ResponseCode.INPUT_CHECK_ERROR, "로그인한 계정 정보를 찾을 수 없습니다.");
        }
        return resultVoHelper.buildFromMap(profileResult(profile), ResponseCode.SUCCESS);
    }

    @PutMapping("/profile")
    @Operation(summary = "내 프로필 수정", security = { @SecurityRequirement(name = "Authorization") })
    public ResultVO updateMyProfile(
            @RequestBody MyProfileUpdateRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            return resultVoHelper.buildFromMap(profileResult(
                    profileSettingsService.updateMyProfile(user, request)), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> result = new HashMap<String, Object>();
            result.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(result, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    @PutMapping("/password")
    @Operation(summary = "내 비밀번호 변경", security = { @SecurityRequirement(name = "Authorization") })
    public ResultVO changeMyPassword(
            @RequestBody PasswordChangeRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        try {
            profileSettingsService.changeMyPassword(user, request);
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            Map<String, Object> result = new HashMap<String, Object>();
            result.put("message", ex.getMessage());
            return resultVoHelper.buildFromMap(result, ResponseCode.INPUT_CHECK_ERROR);
        }
    }

    private Map<String, Object> profileResult(MyProfileVO profile) {
        Map<String, Object> result = new HashMap<String, Object>();
        result.put("userId", profile.getUserId());
        result.put("employeeId", profile.getEmployeeId());
        result.put("name", profile.getName());
        result.put("email", profile.getEmail());
        result.put("departmentName", profile.getDepartmentName());
        result.put("levelName", profile.getLevelName());
        result.put("profileImage", profile.getProfileImage());
        result.put("stampImage", profile.getStampImage());
        return result;
    }
}
