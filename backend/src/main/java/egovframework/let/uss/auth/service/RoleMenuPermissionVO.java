package egovframework.let.uss.auth.service;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 메뉴 권한 매핑 VO 클래스
 * @author S-ERP
 * @since 2024.01.01
 * @version 1.0
 */
@Schema(description = "역할 메뉴 권한 매핑 VO")
@Getter
@Setter
public class RoleMenuPermissionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "역할 메뉴 권한 매핑 ID")
    private Long roleMenuPermissionId;

    @Schema(description = "역할 ID")
    private Long roleId;

    @Schema(description = "역할 코드")
    private String roleCode = "";

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "테넌트 코드")
    private String tenantCode = "";

    @Schema(description = "메뉴 ID")
    private Long menuId;

    @Schema(description = "메뉴 ID (비즈니스 코드)")
    private String menuCode = "";

    @Schema(description = "권한(Permission) ID")
    private Long permissionId;

    @Schema(description = "권한(Permission) 코드")
    private String permissionCode = "";

    @Schema(description = "사용여부")
    private String useAt = "Y";

    @Schema(description = "최초등록일시")
    private Date frstRegistPnttm;

    @Schema(description = "최초등록자ID")
    private String frstRegisterId = "";

    @Schema(description = "최종수정일시")
    private Date lastUpdtPnttm;

    @Schema(description = "최종수정자ID")
    private String lastUpdusrId = "";

    // 추가 필드 (조회용)
    @Schema(description = "역할명")
    private String roleNm = "";

    @Schema(description = "메뉴명")
    private String menuNm = "";

    @Schema(description = "권한명")
    private String permissionNm = "";

    @Schema(description = "권한 레벨")
    private String permissionLevel = "";

    @Schema(description = "메뉴 URL")
    private String menuUrl = "";
}