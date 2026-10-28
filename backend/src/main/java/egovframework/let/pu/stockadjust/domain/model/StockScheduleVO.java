package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 대기·적용된 재고조정 한 줄(원재료 material_stock_schedule · 제품 product_stock_schedule 공용, 송연 stock-schedule · stock-history) VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class StockScheduleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    /** 원재료코드 또는 제품코드 */
    private String code;
    private String name;
    /** 엑셀에서 가져온 수량(적용 뒤에는 실제로 넣은 값) */
    private Double newStockQty;
    /** 화면에서 고친 수량 */
    private Double editedQty;
    private String effectiveDate;
    /** 지금 전산 재고 */
    private Double currentStockQty;
    private String warehouse;
    private Double unitPrice;
    /** 고친 수량이 있으면 그것, 없으면 엑셀 수량 */
    private Double targetQty;
    /** 대기: 목표 - 지금 / 적용: 이후 - 이전 */
    private Double diff;
    private Double oldStockQty;
    private String note;
    private Integer applied;
    private String createdAt;
}
