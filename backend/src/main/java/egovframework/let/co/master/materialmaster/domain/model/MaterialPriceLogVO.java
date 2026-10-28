package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 단가 변경로그 VO 클래스 (송연 material_price_log)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 단가 변경로그 모델")
@Getter
@Setter
public class MaterialPriceLogVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "변경일시")
    private String changedAt;

    @Schema(description = "이전 단가")
    private Double oldPrice;

    @Schema(description = "변경 단가")
    private Double newPrice;
}
