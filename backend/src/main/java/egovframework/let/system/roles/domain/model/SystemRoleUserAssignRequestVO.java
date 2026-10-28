package egovframework.let.system.roles.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 사용자 매핑 추가 요청 VO
 * @author S-ERP
 * @since 2026.09.03
 * @version 1.0
 */
@Schema(description = "역할 사용자 매핑 추가 요청 모델")
@Getter
@Setter
public class SystemRoleUserAssignRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "로그인 ID")
    private Long loginId;

    @Schema(description = "사용자 ID")
    private Long userId;
}
