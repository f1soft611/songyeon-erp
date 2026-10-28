package egovframework.let.system.menus.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 사용자 기준 모듈-메뉴 트리 응답을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "사용자 기준 모듈-메뉴 응답 모델")
@Getter
@Setter
public class MyMenuResponseVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 정보")
    private UserSummary user;

    @Schema(description = "모듈-메뉴 트리")
    private List<MenuTreeNodeVO> menus;

    @Getter
    @Setter
    public static class UserSummary implements Serializable {
        private static final long serialVersionUID = 1L;

        @Schema(description = "사용자 ID")
        private String userId;

        @Schema(description = "사용자 이름")
        private String name;

        @Schema(description = "이메일")
        private String email;

        @Schema(description = "부서명")
        private String departmentName;

        @Schema(description = "직급 ID")
        private Long levelId;

        @Schema(description = "직급 코드")
        private String levelCode;

        @Schema(description = "직급명")
        private String levelName;

        @Schema(description = "프로필 이미지")
        private String profileImage;

        @Schema(description = "그룹명")
        private String groupName;

        @Schema(description = "역할명")
        private String roleName;

        @Schema(description = "역할 목록")
        private List<String> roles;
    }
}
