package egovframework.let.system.menus.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 기준 메뉴 권한 저장 요청 모델
 */
@Schema(description = "역할 기준 메뉴 권한 저장 요청 모델")
@Getter
@Setter
public class SystemMenuRolePermissionSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "메뉴별 역할 권한 설정 목록")
    private List<SystemMenuPermissionEntry> menuPermissions = new ArrayList<>();
}
