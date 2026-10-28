package egovframework.let.ha.accbasic.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.ha.accbasic.domain.model.AccBankAccountVO;
import egovframework.let.ha.accbasic.domain.model.AccCardVO;
import egovframework.let.ha.accbasic.domain.model.AccSubjectVO;

/**
 * 인사·회계 - 기초회계정보 데이터 접근 클래스 (송연 acc_subject · acc_bank_account · acc_card)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Repository("accBasicDAO")
public class AccBasicDAO extends EgovAbstractMapper {

    private static int count(Integer n) {
        return n == null ? 0 : n;
    }

    public List<AccSubjectVO> selectSubjects() throws Exception {
        return selectList("AccBasicDAO.selectSubjects");
    }

    public int countSubjectCode(String code, Long exceptId) throws Exception {
        Map<String, Object> p = new HashMap<>();
        p.put("code", code);
        p.put("id", exceptId);
        return count(selectOne("AccBasicDAO.countSubjectCode", p));
    }

    public int insertSubject(Map<String, Object> values) throws Exception {
        return insert("AccBasicDAO.insertSubject", values);
    }

    public int updateSubject(Map<String, Object> values) throws Exception {
        return update("AccBasicDAO.updateSubject", values);
    }

    public int deleteSubject(long id) throws Exception {
        return delete("AccBasicDAO.deleteSubject", id);
    }

    public List<AccBankAccountVO> selectBankAccounts() throws Exception {
        return selectList("AccBasicDAO.selectBankAccounts");
    }

    public int insertBankAccount(Map<String, Object> values) throws Exception {
        return insert("AccBasicDAO.insertBankAccount", values);
    }

    public int updateBankAccount(Map<String, Object> values) throws Exception {
        return update("AccBasicDAO.updateBankAccount", values);
    }

    public int countCardsOfBank(long id) throws Exception {
        return count(selectOne("AccBasicDAO.countCardsOfBank", id));
    }

    public int deleteBankAccount(long id) throws Exception {
        return delete("AccBasicDAO.deleteBankAccount", id);
    }

    public List<AccCardVO> selectCards() throws Exception {
        return selectList("AccBasicDAO.selectCards");
    }

    public int insertCard(Map<String, Object> values) throws Exception {
        return insert("AccBasicDAO.insertCard", values);
    }

    public int updateCard(Map<String, Object> values) throws Exception {
        return update("AccBasicDAO.updateCard", values);
    }

    public int deleteCard(long id) throws Exception {
        return delete("AccBasicDAO.deleteCard", id);
    }
}
