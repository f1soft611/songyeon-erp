package egovframework.let.pd.actual.service;

import java.util.List;

import egovframework.let.pd.actual.domain.model.ProductionActualVO;

/**
 * 생산관리 - 생산입고 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ProductionActualService {

    /** 그 날짜에 확정된 생산건(날짜 필수) */
    List<ProductionActualVO> listSchedule(String date) throws Exception;

    /**
     * 실생산량 저장. 실생산량은 재고를 만들어내는 자리라, 넣은 만큼 제품 재고가 늘고(원장 기록) 만든 만큼 필름·파우치가 빠진다.
     * 고치면 그 차이만큼만 움직인다(생산정정). 비워서 보내면 입고취소 — 넣었던 만큼 되돌린다.
     * @param userName 원장에 남길 '누가'
     */
    void saveActualQty(long id, String actualQty, String userName) throws Exception;
}
