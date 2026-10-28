package egovframework.let.system.menus.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.IntermediateResultVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.service.ProfileSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 로그인 사용자 기준 모듈-메뉴 트리 조회를 위한 컨트롤러 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/v1/menus")
@Tag(name = "MyMenuApiController", description = "사용자 메뉴 조회")
public class MyMenuApiController {

    private final SystemMenuService systemMenuService;
    private final ProfileSettingsService profileSettingsService;

    @Operation(summary = "내 모듈-메뉴 트리 조회",
            description = "로그인 사용자의 테넌트/역할 기준 모듈-메뉴 트리와 권한을 조회한다",
            security = { @SecurityRequirement(name = "Authorization") },
            tags = { "MyMenuApiController" })
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공"),
            @ApiResponse(responseCode = "403", description = "인가된 사용자가 아님")
    })
    @GetMapping("/my")
    public IntermediateResultVO<MyMenuResponseVO> getMyMenus(
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        if (user == null) {
            return IntermediateResultVO.success(null);
        }
        MyMenuResponseVO response = systemMenuService.getMyMenuTree(
                user.getTenantId(),
                user.getId(),
                user.getRoleId(),
                user.getRoleCode());
        if (response.getUser() != null) {
            response.getUser().setName(user.getName());
            response.getUser().setEmail(user.getEmail());
                MyProfileVO profile = null;
                try {
                    profile = profileSettingsService.getMyProfile(user);
                } catch (Exception ex) {
                    log.warn("Unable to load profile image for menu summary: loginCode={}", user.getId());
                }
                response.getUser().setProfileImage(
                        profile == null ? user.getProfileImage() : profile.getProfileImage());
            response.getUser().setDepartmentName(user.getDepartmentName());
            response.getUser().setLevelId(user.getLevelId());
            response.getUser().setLevelCode(user.getLevelCode());
            response.getUser().setLevelName(user.getLevelName());
            response.getUser().setGroupName(user.getGroupNm());
            response.getUser().setRoleName(user.getRoleCode());
        }
        IntermediateResultVO<MyMenuResponseVO> result = IntermediateResultVO.success(response);
        result.setResultMessage(ResponseCode.SUCCESS.getMessage());
        return result;
    }
}
