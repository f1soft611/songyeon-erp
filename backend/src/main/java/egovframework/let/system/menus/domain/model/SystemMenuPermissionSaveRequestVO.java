package egovframework.let.system.menus.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 메뉴 버튼 권한 저장 요청을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "메뉴 버튼 권한 저장 요청 모델")
@Getter
@Setter
public class SystemMenuPermissionSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "권한 코드 목록")
    private List<String> permissionCodes = new ArrayList<>();
}