package egovframework.let.system.screenreview.service;

import egovframework.let.system.screenreview.domain.model.ScreenReviewDetailVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSaveVO;

/**
 * 화면검수 서비스 인터페이스 클래스
 * 흐름: 업체가 수정요청 → 개발사가 확인하고 검수진행중 → 업체가 확인하고 검수완료.
 * 검수자는 로그인한 사람의 사번(employees.id), 검수일은 서버의 오늘 날짜다. 요청일은 수정요청으로 바꾼 날이다.
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
// 검수자 · 작성자는 로그인한 사람의 사번(employees.id). 컨트롤러가 LoginEmployeeResolver 로 찾아 넘긴다
public interface ScreenReviewService {

    /** 화면ID(menu_code)의 현황 · 이력(첨부 포함) · 내 임시저장(첨부 포함) */
    ScreenReviewDetailVO getDetail(Long tenantId, String menuCode, String empId) throws Exception;

    /** 임시저장(의견만, 상태는 받지 않는다). 첨부를 올릴 임시저장 번호를 돌려준다 */
    Long saveDraft(Long tenantId, String menuCode, String empId, ScreenReviewSaveVO payload) throws Exception;

    /**
     * 저장: 상태를 바꾸고 이력 한 줄을 남긴다. 내 임시저장의 첨부는 이 이력으로 옮기고 임시저장은 지운다.
     * 고를 수 없는 상태이거나 그사이 다른 사람이 상태를 바꿨으면 IllegalArgumentException. 첨부를 올릴 이력 번호를 돌려준다
     */
    Long save(Long tenantId, String menuCode, String empId, ScreenReviewSaveVO payload) throws Exception;
}
