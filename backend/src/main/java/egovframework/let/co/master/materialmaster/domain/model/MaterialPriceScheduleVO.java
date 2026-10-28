package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 예약 단가변경 VO 클래스 (송연 material_price_schedule)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 예약 단가변경 모델")
@Getter
@Setter
public class MaterialPriceScheduleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "예약 ID")
    private Long id;

    @Schema(description = "원재료코드")
    private String materialCode;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "바뀔 단가")
    private Double newPrice;

    @Schema(description = "적용일자(YYYY-MM-DD)")
    private String effectiveDate;

    @Schema(description = "적용됨(1)")
    private Integer applied;
}
