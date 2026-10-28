package egovframework.let.ha.accbasic.service;

import java.util.List;

import egovframework.let.ha.accbasic.domain.model.AccBankAccountVO;
import egovframework.let.ha.accbasic.domain.model.AccCardVO;
import egovframework.let.ha.accbasic.domain.model.AccSubjectVO;

/**
 * 인사·회계 - 기초회계정보 서비스 인터페이스 (송연 accounting.py 계정과목 · 계좌 · 카드)
 * 쓰던 것을 지우면 그것으로 적어둔 지난 전표가 무엇이었는지 알 수 없게 되므로, 목록에서 내리는 '사용안함' 을 기본으로 한다.
 * 저장은 하나의 규칙으로: 새로 만들기(id 없음)와 고치기(id 있음), 사용 켜고 끄기도 같은 저장을 쓴다(검사가 두 곳으로 갈라지지 않게).
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
public interface AccBasicService {

    List<AccSubjectVO> listSubjects() throws Exception;

    void saveSubject(AccSubjectVO request) throws Exception;

    void deleteSubject(long id) throws Exception;

    List<AccBankAccountVO> listBankAccounts() throws Exception;

    void saveBankAccount(AccBankAccountVO request) throws Exception;

    void deleteBankAccount(long id) throws Exception;

    List<AccCardVO> listCards() throws Exception;

    void saveCard(AccCardVO request) throws Exception;

    void deleteCard(long id) throws Exception;
}
