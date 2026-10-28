package egovframework.let.pd.status.service;

import java.util.List;

import egovframework.let.pd.status.domain.model.ProductionStatusVO;

/**
 * 생산관리 - 생산현황 서비스 인터페이스 클래스 (조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ProductionStatusService {

    /** 생산입고(실생산량이 적힌) 기록을 기간으로. 기간 필수, 품목명·거래처명은 일부 일치(비우면 전체). */
    List<ProductionStatusVO> listStatus(String start, String end, String productName, String clientName) throws Exception;
}
