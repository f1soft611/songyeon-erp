package egovframework.let.sl.register.service;

import egovframework.let.sl.register.domain.model.SalesPullRequestVO;
import egovframework.let.sl.register.domain.model.SalesPullResultVO;
import egovframework.let.sl.register.domain.model.SalesRecordVO;
import egovframework.let.sl.register.domain.model.ShippableListVO;

/**
 * 판매관리 - 판매등록 서비스 인터페이스 클래스 (송연 sales.py)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
public interface SalesRegisterService {

    /** 기간 안 출하확정된 건(판매로 끌어올 후보). 이미 들어간 건은 already=true. 기간 필수. */
    ShippableListVO listShippable(String start, String end, String clientName) throws Exception;

    /** 고른 출하확정 건을 판매로 넣는다. 지금 출하 기록에서 다시 세고, 이미 들어간 것·없어진 것은 건너뛴다. */
    SalesPullResultVO pull(SalesPullRequestVO request, String employeeId) throws Exception;

    /** 출하 없이 판 것을 직접 적는다. 단가를 비우면 단가관리의 판매단가를 쓴다. */
    void createManual(SalesRecordVO request, String employeeId) throws Exception;
}
