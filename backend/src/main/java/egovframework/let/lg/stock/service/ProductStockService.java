package egovframework.let.lg.stock.service;

import java.util.List;

import egovframework.let.lg.stock.domain.model.ProductStockVO;
import egovframework.let.lg.stock.domain.model.StockAsOfVO;
import egovframework.let.sales.shipment.shipmentregister.domain.model.ProductLotVO;

/**
 * 물류관리 - 제품재고관리 서비스 인터페이스 클래스 (조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ProductStockService {

    /** 제품 현재고와 생산예정(실생산량이 아직 없는 생산확정 지시량 합계·건수). sort = name-asc | name-desc */
    List<ProductStockVO> listStock(String q, String clientName, String sort) throws Exception;

    /** 그 날짜(그날 끝) 기준 제품별 재고와 재고금액(원재료비 기준). 날짜를 비우면 오늘. */
    StockAsOfVO stockAsOf(String date, String clientName) throws Exception;

    /** 제품의 로트(생산확정 줄마다 생산량·출하량·잔량). 출하등록의 로트와 같은 계산이다. */
    List<ProductLotVO> listLots(String code) throws Exception;
}
