package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 배합비 한 줄 (송연 bom). ratioPercent 는 이름과 달리 0~1 비율
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "배합비 한 줄 (송연 bom). ratioPercent 는 이름과 달리 0~1 비율")
@Getter
@Setter
public class BomLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료 코드")
    private String materialCode;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "배합비율 (0~1)")
    private Double ratioPercent;

    @Schema(description = "원재료단가 (원/kg)")
    private Double unitPricePerKg;

    @Schema(description = "적용단가 = 배합비율 × 단가")
    private Double amountPerKg;

    @Schema(description = "순서 (1부터)")
    private Integer rank;
}
