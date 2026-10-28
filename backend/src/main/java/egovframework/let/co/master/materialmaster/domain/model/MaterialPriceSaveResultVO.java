package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 단가 저장 결과 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 단가 저장 결과")
@Getter
@Setter
public class MaterialPriceSaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "예약으로 걸었는지")
    private Boolean scheduled;

    @Schema(description = "예약 적용일자")
    private String effectiveDate;

    @Schema(description = "바로 반영한 경우, 단가가 따라 바뀐 제품 수")
    private Integer affectedProducts;
}
