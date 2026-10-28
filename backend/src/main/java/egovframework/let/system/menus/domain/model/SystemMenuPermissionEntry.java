package egovframework.let.system.menus.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할별 메뉴 권한 설정 항목 모델
 */
@Schema(description = "역할 기준 메뉴 권한 설정 항목")
@Getter
@Setter
public class SystemMenuPermissionEntry implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "메뉴 ID")
    private Long menuId;

    @Schema(description = "메뉴 코드")
    private String menuCode;

    @Schema(description = "허용된 권한 코드 목록")
    private List<String> permissionCodes = new ArrayList<>();

    @Schema(description = "메뉴 사용 여부")
    private boolean enabled = true;

    public SystemMenuPermissionEntry() {
    }

    public SystemMenuPermissionEntry(Long menuId, List<String> permissionCodes, boolean enabled) {
        this.menuId = menuId;
        this.permissionCodes = sanitize(permissionCodes);
        this.enabled = enabled;
    }

    public SystemMenuPermissionEntry(List<String> permissionCodes, boolean enabled) {
        this(null, permissionCodes, enabled);
    }

    public SystemMenuPermissionEntry(String firstPermissionCode, String secondPermissionCode, boolean enabled) {
        this(null, Arrays.asList(firstPermissionCode, secondPermissionCode), enabled);
    }

    public boolean isEmpty() {
        return permissionCodes == null || permissionCodes.isEmpty();
    }

    private static List<String> sanitize(List<String> permissionCodes) {
        if (permissionCodes == null || permissionCodes.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> normalized = new ArrayList<>();
        for (String permissionCode : permissionCodes) {
            if (permissionCode != null && !permissionCode.trim().isEmpty()) {
                normalized.add(permissionCode.trim());
            }
        }
        return normalized;
    }
}
