package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 원재료 재고 손으로 고치기 요청(송연 /api/materials/{code}/movement) VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class MovementRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String inQty;
    private String outQty;
    /** 적용재고: 있으면 입고·출고 대신 이 값으로 맞춘다 */
    private String setQty;
    private String note;
}
