package egovframework.let.ha.accsales.service;

import java.util.List;
import java.util.Map;

/**
 * 인사·회계 - 매출·매입관리 서비스 인터페이스 (송연 accounting.py /api/accounting/trade-report)
 * 매출(확정된 출하 × 판매단가)과 매입(입고 기록)을 기간 · 거래처 · 품목으로 묻고 집계 / 내역 / 전년동기간비교 중 하나로 낸다. 고치는 일은 없다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
public interface AccSalesService {

    /**
     * filter: kind(매출·매입) · start · end(필수) · view(summary·detail·yoy, 없으면 summary) · unit(day·month·year, 없으면 month).
     * clients · items 는 고른 이름 그대로만 남긴다(비우면 전체).
     * → {kind, view, unit, start, end, clients, items, totalAmount, totalQty, unpriced} + rows | periods | compare(prevStart, prevEnd, totalPrev, totalDiff, totalPct)
     */
    Map<String, Object> tradeReport(Map<String, String> filter, List<String> clients, List<String> items) throws Exception;

    /** 조회 창에서 고를 거리 → {clients, items}. 매출: 거래처BOM 전체 · 단종 아닌 제품 '이름(규격)', 매입: 매입처 · 원재료 이름 */
    Map<String, Object> options(String kind) throws Exception;
}
