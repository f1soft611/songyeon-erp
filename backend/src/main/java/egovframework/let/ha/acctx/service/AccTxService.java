package egovframework.let.ha.acctx.service;

import java.util.Map;

import egovframework.let.ha.acctx.domain.model.AccTransactionSaveVO;

/**
 * 인사·회계 - 회계거래현황 서비스 인터페이스 (송연 accounting.py /api/accounting/transactions)
 * 매일 들어오고 나간 돈을 적고, 지난 것을 찾아 고친다. 금액은 늘 양수로 적고 방향은 입금 · 출금이 정한다.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
public interface AccTxService {

    /** 기간(필수) · 입금/출금 · 거래처 일부로 찾기 → {rows, inTotal, outTotal} */
    Map<String, Object> listTransactions(Map<String, String> filter) throws Exception;

    /** id 가 null 이면 새로 적고, 있으면 고친다(적은 사람은 처음 적은 사람 그대로) */
    void saveTransaction(Long id, AccTransactionSaveVO request, String employeeName) throws Exception;

    void deleteTransaction(long id) throws Exception;

    /**
     * 입·출금관리: 한쪽(입금 또는 출금)만 기간 · 거래처로 찾아 날짜별 줄과 함께 계정과목별 · 거래처별 · 수단별 묶음을 낸다
     * → {kind, start, end, rows, total, bySubject, byClient, byMethod}. 묶음은 {label, amount, count} 를 금액 큰 순으로.
     * 한 달치를 늘어놓기만 하면 '무엇에 얼마나 나갔나' 를 사람이 손으로 세게 된다.
     */
    Map<String, Object> cashReport(Map<String, String> filter) throws Exception;
}
