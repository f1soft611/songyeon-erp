package egovframework.let.system.roles.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 등록/수정 요청을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "역할 저장 요청 모델")
@Getter
@Setter
public class SystemRoleSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "역할 코드")
    private String roleCode;

    @Schema(description = "역할명")
    private String roleNm;

    @Schema(description = "역할 설명")
    private String roleDc;

    @Schema(description = "사용 여부")
    private String useAt;
}
