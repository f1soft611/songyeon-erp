package egovframework.let.lg.stock.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 제품재고 한 줄 VO 클래스 (송연 LG0001DTO 의 제품 · 날짜 기준 재고금액 부분).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "제품재고 한 줄")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ProductStockVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드")
    private String code;

    @Schema(description = "품목명")
    private String name;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "현재고(날짜 기준 조회면 그 날짜 끝의 재고)")
    private Double stockQty;

    @Schema(description = "생산예정: 생산확정됐지만 실생산량이 아직 없는 지시량 합계")
    private Double plannedQty;

    @Schema(description = "생산예정 건수")
    private Integer plannedCount;

    @Schema(description = "단위당 원재료비(단가관리)")
    private Double materialCost;

    @Schema(description = "재고금액 = 재고 × 단위당 원재료비")
    private Double amount;

    // 계산에만 쓰는 값(생산확정 줄의 품목명·지시량, 원장 합계)
    @JsonIgnore
    private String productName;
    @JsonIgnore
    private String orderQty;
    @JsonIgnore
    private String productCode;
    @JsonIgnore
    private Double qty;
}
