package egovframework.let.pu.substitution.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재료 치환등록 바꿔 쓰기 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "바꿔 쓰기 요청")
@Getter
@Setter
public class SubstitutionRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "배합표의 원래 원재료 코드")
    private String fromMaterialCode;
    @Schema(description = "대신 쓸 원재료 코드")
    private String toMaterialCode;
    @Schema(description = "바꾼 이유(선택)")
    private String reason;
}
