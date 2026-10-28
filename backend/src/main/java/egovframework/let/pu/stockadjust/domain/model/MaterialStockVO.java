package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 전체 재고 조회 한 줄 · 창고이동용 원재료 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class MaterialStockVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String spec;
    private Double unitPrice;
    private Double stockQty;
    private Double unitWeight;
    private Integer boxQty;
    private String unit;
    private String unitNm; // 단위 이름(2026-10-23, unit 은 공통코드 UNIT 코드)
}
