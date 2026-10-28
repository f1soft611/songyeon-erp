package egovframework.let.pu.substitution.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재료 치환등록 '대신 쓸 원재료' 후보 VO 클래스 (송연 /api/materials 의 code · name · stock_qty)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "대신 쓸 원재료 후보")
@Getter
@Setter
public class SubstitutionMaterialVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    @Schema(description = "지금 재고")
    private Double stockQty;
}
