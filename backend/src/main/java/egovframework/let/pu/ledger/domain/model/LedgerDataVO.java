package egovframework.let.pu.ledger.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 수불대장 조회용 한 줄 VO 클래스 (원재료 한 줄 · 날짜별 집계 한 줄을 같이 담는다)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class LedgerDataVO implements Serializable {

    private static final long serialVersionUID = 1L;

    // 원재료
    private String code;
    private String name;
    private String spec;
    private Double stockQty;
    private Double safetyStock;
    private Double baseOrderQty;
    private String warehouse;
    private String subCategory;
    private String subCategoryNm; // 부자재 분류 이름(2026-10-23, subCategory 는 공통코드 코드)
    private String unit;
    private String unitNm; // 단위 이름(2026-10-23, unit 은 공통코드 UNIT 코드)
    private Double unitPrice;
    private String[] suppliers;

    // 날짜별 집계
    private String d;
    private Double qty;
    private Double inQty;
    private Double outQty;
    private String notes;
}
