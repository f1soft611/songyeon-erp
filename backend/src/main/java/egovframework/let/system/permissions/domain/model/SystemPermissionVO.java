package egovframework.let.system.permissions.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 권한 정보 응답을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "권한 정보 모델")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SystemPermissionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "권한 ID")
    private Long permissionId;

    @Schema(description = "권한 코드")
    private String permissionCode;

    @Schema(description = "권한명")
    private String permissionName;

    @Schema(description = "정렬 순서")
    private int sortOrder;
}