package egovframework.let.system.roles.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 조회조건을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "역할 검색 조건 모델")
@Getter
@Setter
public class SystemRoleSearchConditionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "사용 여부")
    private String useAt;
}
