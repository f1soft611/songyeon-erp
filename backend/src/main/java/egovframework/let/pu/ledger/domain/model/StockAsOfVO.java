package egovframework.let.pu.ledger.domain.model;

import java.io.Serializable;
import java.util.List;

import egovframework.let.common.inventory.domain.model.WarehouseQtyVO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 그 날짜 끝 시점의 원재료 재고·재고금액 VO 클래스 (송연 /api/materials/stock-as-of)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "기준일 원재료 재고")
@Getter
@Setter
public class StockAsOfVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String date;
    private List<Row> materials;
    @Schema(description = "단가가 있는 줄의 재고금액 합")
    private Double totalAmount;
    private List<String> warehouses;

    @Getter
    @Setter
    public static class Row implements Serializable {

        private static final long serialVersionUID = 1L;

        private String code;
        private String name;
        private String spec;
        private String subCategory;
        private String subCategoryNm; // 부자재 분류 이름(2026-10-23, subCategory 는 공통코드 코드)
        private Double stockQty;
        private Double unitPrice;
        @Schema(description = "재고 × 단가(단가가 없으면 비움)")
        private Double amount;
        private List<WarehouseQtyVO> warehouseStock;
    }
}
