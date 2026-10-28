package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 단가표 원가 항목 (원재료비를 다시 계산할 때 더함)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "단가표 원가 항목 (원재료비를 다시 계산할 때 더함)")
@Getter
@Setter
public class PricingCostsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Double lossCost;

    private Double markupCost;

    private Double laborCost;

    private Double packagingCost;

    private Double logisticsCost;

    private Double margin;

    private Double otherCost1;

    private Double otherCost2;

    private Double otherCost3;

    private Double otherCost4;
}
