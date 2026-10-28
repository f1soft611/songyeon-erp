package egovframework.let.ha.accledger.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.ha.acctx.domain.model.AccTransactionVO;

/**
 * 인사·회계 - 거래처별관리대장 데이터 접근 클래스 (송연 accounting.py /api/accounting/client-ledger 의 acc_transaction · clients 읽기, 조회만)
 * 매출 · 매입 줄은 매출·매입관리와 같은 것을 쓴다(accsales TradeRowReader).
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Repository("accLedgerDAO")
public class AccLedgerDAO extends EgovAbstractMapper {

    /** {kind(입금·출금), clientName, start} 시작일 앞까지 받은(준) 돈 합 */
    public double sumPaidBefore(Map<String, Object> filter) throws Exception {
        Double sum = selectOne("AccLedgerDAO.sumPaidBefore", filter);
        return sum == null ? 0 : sum;
    }

    /** {kind, clientName, start, end} 기간 안의 입금(출금) 전표 (날짜 → id 순) */
    public List<AccTransactionVO> selectPaid(Map<String, Object> filter) throws Exception {
        return selectList("AccLedgerDAO.selectPaid", filter);
    }

    public String selectBusinessNo(String clientName) throws Exception {
        return selectOne("AccLedgerDAO.selectBusinessNo", clientName);
    }
}
