package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 재고조사 엑셀 올리기 요청(화면에서 읽은 엑셀 줄 그대로, 머리줄 포함) VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class StockUploadRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 원재료: 고른 창고(비우면 창고 구분 없이) */
    private String warehouse;
    /** 엑셀 첫 장의 줄(1행은 머리줄) */
    private List<List<String>> rows;
}
