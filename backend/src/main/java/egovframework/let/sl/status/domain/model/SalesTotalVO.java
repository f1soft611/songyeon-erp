package egovframework.let.sl.status.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 토탈집계 VO 클래스 (송연 GET /api/sales/total). 입고와 출고 수량은 따로 더한다 — 둘을 한 숫자로 더하면 뜻이 없다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "토탈집계")
@Getter
@Setter
public class SalesTotalVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<SaleRowVO> rows;
    private int count;
    private int inCount;
    private int outCount;
    private double inQty;
    private double outQty;
    @Schema(description = "금액 합계(출고만, 입고에는 금액이 없다)")
    private double totalAmount;
    @Schema(description = "금액이 비어 있는 출고 줄 수")
    private int noPriceCount;
}
