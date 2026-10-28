package egovframework.let.pu.stockstatus.service;

import java.util.List;

import egovframework.let.pu.ledger.domain.model.StockAsOfVO;
import egovframework.let.pu.stockstatus.domain.model.MaterialLotVO;

/**
 * 구매관리 - 재고현황 서비스 인터페이스 (송연 /api/materials/stock-as-of · /api/materials/{code}/lots)
 * 수불대장이 '앞으로 얼마를 사야 하는가' 를 보는 곳이라면, 이 화면은 '지금 창고에 몇이 있는가' 를 본다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface StockStatusService {

    /** 기준일(그 날 끝) 원재료·부자재 재고 · 창고별 · 재고금액(날짜를 비우면 오늘). 수불대장과 같은 계산 */
    StockAsOfVO stockAsOf(String date) throws Exception;

    /** 기준일까지 들어온 이 원재료의 입고 로트(최근 위). 실입고 = 입고량 - 반품 */
    List<MaterialLotVO> listLots(String code, String date) throws Exception;
}
