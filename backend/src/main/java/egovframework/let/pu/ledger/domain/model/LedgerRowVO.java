package egovframework.let.pu.ledger.domain.model;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

import egovframework.let.common.inventory.domain.model.WarehouseQtyVO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 수불대장 원재료 한 줄 VO 클래스 (송연 /api/purchase-stock-range 의 한 줄과 같은 칸)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "수불대장 한 줄")
@Getter
@Setter
public class LedgerRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String spec;
    @Schema(description = "지금 재고")
    private Double stockQty;
    @Schema(description = "날짜별 사용량(생산 사용 + 손으로 뺀 것)")
    private Map<String, Double> usageByDate;
    @Schema(description = "날짜별 입고량(입고·반품 + 손으로 넣은 것)")
    private Map<String, Double> receivingByDate;
    @Schema(description = "날짜별 이미 낸 발주량(이 칸은 잠근다)")
    private Map<String, Double> orderByDate;
    private Double totalUsage;
    private Double totalReceiving;
    @Schema(description = "기간 안 재고조사로 맞춘 양(새 재고 - 옛 재고)")
    private Double totalAdjust;
    private String adjustNote;
    @Schema(description = "전일재고(시작일 전날 끝 재고)")
    private Double baseStock;
    @Schema(description = "남은재고(끝날 끝 재고)")
    private Double remainingStock;
    private List<WarehouseQtyVO> warehouseStock;
    private Double safetyStock;
    private Double baseOrderQty;
    @Schema(description = "안전재고보다 적을 때 미리 채워둘 발주량(저장 전)")
    private Double suggestedOrderQty;
    private boolean belowSafety;
    private String warehouse;
    private String subCategory;
    private String subCategoryNm; // 부자재 분류 이름(2026-10-23, subCategory 는 공통코드 코드)
    private String unit;
    private String unitNm; // 단위 이름(2026-10-23, unit 은 공통코드 UNIT 코드)
    @Schema(description = "납품업체 이름(원재료BOM 의 업체코드 배열을 거래처 이름으로)")
    private List<String> suppliers;
}
