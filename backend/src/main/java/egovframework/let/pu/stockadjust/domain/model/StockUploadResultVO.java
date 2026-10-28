package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 재고조사 엑셀 올리기 결과 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class StockUploadResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int staged;
    private int skipped;
}
