package egovframework.let.lg.stock.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 날짜 기준 제품재고·재고금액 VO 클래스 (송연 stock-as-of 의 {date, products, total_amount})
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "날짜 기준 제품재고")
@Getter
@Setter
public class StockAsOfVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "기준일(비우면 오늘)")
    private String date;

    @Schema(description = "제품별 재고·재고금액")
    private List<ProductStockVO> products;

    @Schema(description = "총 재고금액(원재료비 기준)")
    private Double totalAmount;
}
