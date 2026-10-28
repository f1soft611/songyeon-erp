package egovframework.let.pu.ledger.service;

import java.util.List;

import egovframework.let.pu.ledger.domain.model.LedgerRowVO;
import egovframework.let.pu.ledger.domain.model.StockAsOfVO;

/**
 * 구매관리 - 수불대장 서비스 인터페이스 (송연 app.py purchase_stock_range_report · materials_stock_as_of)
 * 입력이 잘못되면 IllegalArgumentException(송연과 같은 문구).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface StockLedgerService {

    /**
     * 기간 수불: 원재료마다 전일재고(시작일 전날 끝) · 날짜별 사용량 · 날짜별 이미 낸 발주량 · 입고 · 남은재고(끝날 끝).
     * 원재료와 부자재를 모두 준다(화면 탭에서 가른다). 시작·끝 필수.
     */
    List<LedgerRowVO> ledger(String start, String end) throws Exception;

    /** 그 날짜 끝 시점의 원재료별 재고수량과 재고금액(날짜를 비우면 오늘) */
    StockAsOfVO stockAsOf(String date) throws Exception;
}
