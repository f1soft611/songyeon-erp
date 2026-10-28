package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 창고이동 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class WarehouseMoveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialCode;
    private String barcode;
    private String packCount;
    private String movedDate;
    /** 비우면 입고창고가 아닌 창고가 하나뿐일 때 그리로 */
    private String toWarehouse;
}
