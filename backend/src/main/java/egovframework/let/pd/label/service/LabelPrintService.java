package egovframework.let.pd.label.service;

import java.util.List;

import egovframework.let.pd.label.domain.model.LabelPrintVO;

/**
 * 생산관리 - 라벨출력 서비스 인터페이스 클래스 (조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface LabelPrintService {

    /** 그 날짜에 생산확정된 품목(품목명·규격·생산수량·제품코드). 날짜 필수. */
    List<LabelPrintVO> listByDate(String date) throws Exception;
}
