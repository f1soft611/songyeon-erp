package egovframework.let.common.inventory.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 공통 재고 - 재고 계산용 품목 VO 클래스(제품 재고·부자재 연결, 원재료 이름). 화면에 내보내지 않는다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "재고 계산용 품목")
@Getter
@Setter
public class InventoryItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "이름")
    private String name;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "지금 재고")
    private Double stockQty;

    @Schema(description = "한 봉 내용량(kg)")
    private Double pouchNetWeightKg;

    @Schema(description = "한 봉당 필름 길이(M)")
    private Double pouchLengthM;

    @Schema(description = "한 봉당 파우치 수")
    private Double pouchPerUnit;

    @Schema(description = "필름 부자재 코드")
    private String filmMaterialCode;

    @Schema(description = "파우치 부자재 코드")
    private String pouchMaterialCode;

    @Schema(description = "박스 부자재 코드")
    private String boxMaterialCode;
}
