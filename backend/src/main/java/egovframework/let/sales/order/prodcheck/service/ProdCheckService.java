package egovframework.let.sa.feasibility.service;

import java.util.List;

import egovframework.let.sa.feasibility.domain.model.FeasibilityRequestVO;
import egovframework.let.sa.feasibility.domain.model.FeasibilityResultVO;

/**
 * 영업관리 - 생산가능확인 서비스 인터페이스 클래스 (조회만 한다. 아무것도 바꾸지 않는다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface FeasibilityService {

    /** 고를 수 있는 제품(배합비가 있는 사용 중 제품)의 이름(규격), 가나다 순 */
    List<String> listProducts() throws Exception;

    /** 그 날짜 원재료 재고로 만들 것을 다 만들 수 있는지(합계) + 제품 하나씩 따로 */
    FeasibilityResultVO check(FeasibilityRequestVO request) throws Exception;
}
