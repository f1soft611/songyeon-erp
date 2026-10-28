package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 대기 재고조정 확정 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class StockConfirmRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String effectiveDate;
    /** 원재료만: 조정 사유 */
    private String note;
}
