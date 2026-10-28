package egovframework.let.common.inventory.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 공통 재고 - 원재료별 증감 · 창고별 옮긴 양 한 줄 VO 클래스 (송연 material_delta_after · moved_stock_map 의 SQL 결과)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class StockDeltaVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String warehouse;
    private Double qty;
}
