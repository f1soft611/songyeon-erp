package egovframework.let.sl.status.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 판매현황 VO 클래스 (송연 GET /api/sales 의 {rows, total_qty, total_amount, count, no_price_count})
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "판매현황")
@Getter
@Setter
public class SalesStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<SaleRowVO> rows;
    private int count;
    private double totalQty;
    private double totalAmount;
    @Schema(description = "금액이 비어 있는 줄 수(단가가 없어 합계에 안 들어간 것)")
    private int noPriceCount;
}
