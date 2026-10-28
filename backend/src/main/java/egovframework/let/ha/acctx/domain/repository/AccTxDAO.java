package egovframework.let.ha.acctx.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.ha.acctx.domain.model.AccTransactionVO;

/**
 * 인사·회계 - 회계거래현황 데이터 접근 클래스 (송연 acc_transaction)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Repository("accTxDAO")
public class AccTxDAO extends EgovAbstractMapper {

    /** {kind, start, end, clientName} 로 거른 전표(날짜 → id 순) */
    public List<AccTransactionVO> selectTransactions(Map<String, Object> filter) throws Exception {
        return selectList("AccTxDAO.selectTransactions", filter);
    }

    public int countSubject(long id) throws Exception {
        Integer n = selectOne("AccTxDAO.countSubject", id);
        return n == null ? 0 : n;
    }

    public int insertTransaction(Map<String, Object> values) throws Exception {
        return insert("AccTxDAO.insertTransaction", values);
    }

    public int updateTransaction(Map<String, Object> values) throws Exception {
        return update("AccTxDAO.updateTransaction", values);
    }

    public int deleteTransaction(long id) throws Exception {
        return delete("AccTxDAO.deleteTransaction", id);
    }
}
