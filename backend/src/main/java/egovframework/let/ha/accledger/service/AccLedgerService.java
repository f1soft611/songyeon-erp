package egovframework.let.ha.accledger.service;

import java.util.List;
import java.util.Map;

/**
 * 인사·회계 - 거래처별관리대장 서비스 인터페이스 (송연 accounting.py /api/accounting/client-ledger)
 * 채권(받을 돈 = 매출 − 입금) 또는 채무(줄 돈 = 매입 − 출금)를 거래처 여럿에 대해 한 번에 낸다. 고치는 일은 없다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
public interface AccLedgerService {

    /**
     * filter: kind(채권·채무) · start · end(필수). clients 는 한 곳 이상(고른 이름 그대로).
     * → {kind, start, end, clients: [{clientName, businessNo, openingBalance, tradeTotal, paidTotal, closingBalance, unpriced, entries}], totalClosing}
     * 거래처는 남은 돈(절댓값)이 큰 곳부터. entries 는 한 줄이 한 품목이고, 수금 · 지급을 날짜순으로 끼워 넣어 잔액을 이어 센다.
     */
    Map<String, Object> clientLedger(Map<String, String> filter, List<String> clients) throws Exception;

    /** 조회 창에서 고를 거래처: 거래처BOM 전체(송연 /api/accounting/clients) */
    List<String> clientNames() throws Exception;
}
