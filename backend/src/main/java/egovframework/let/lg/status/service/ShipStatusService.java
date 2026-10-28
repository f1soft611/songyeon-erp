package egovframework.let.lg.status.service;

import java.util.List;

import egovframework.let.lg.status.domain.model.ShipStatusVO;

/**
 * 물류관리 - 출하현황 서비스 인터페이스 클래스 (조회만)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
public interface ShipStatusService {

    /** 출하확정된 기록을 기간으로(출하등록 줄 + 생산확정 줄, 출고일·거래처 순). 기간 필수, 품목명·거래처명은 일부 일치. */
    List<ShipStatusVO> listStatus(String start, String end, String productName, String clientName) throws Exception;
}
