package egovframework.let.sales.product.pricing.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 단가상세 원재료 구성 VO 클래스 (송연 bom)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "단가상세 원재료 구성 한 줄")
@Getter
@Setter
public class PricingBomLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "배합비율(0~1)")
    private Double ratioPercent;

    @Schema(description = "원재료단가")
    private Double unitPricePerKg;

    @Schema(description = "적용단가")
    private Double amountPerKg;
}
