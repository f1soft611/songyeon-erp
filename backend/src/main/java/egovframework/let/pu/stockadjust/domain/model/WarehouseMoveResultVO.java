package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 창고이동 결과 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class WarehouseMoveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Double qty;
    private String toWarehouse;
}
