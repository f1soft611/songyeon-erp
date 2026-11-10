package egovframework.let.system.screenreview.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.screenreview.domain.model.ScreenReviewDraftVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewFileVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewHistoryVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSummaryVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewVO;

/**
 * 화면검수 데이터 접근 클래스 (tb_screen_review · tb_screen_review_history · tb_screen_review_draft, 첨부는 tb_common_file)
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Repository("screenReviewDAO")
public class ScreenReviewDAO extends EgovAbstractMapper {

    /** 화면ID(menu_code)의 메뉴 번호 {tenantId, menuCode}. 없으면 null */
    public Long selectMenuId(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.selectMenuId", params);
    }

    /** 화면검수 관리 목록: 사용 중인 화면(하위 메뉴 없는 메뉴)마다 현황 · 마지막 이력 {tenantId} */
    public List<ScreenReviewSummaryVO> selectSummaryList(Map<String, Object> params) throws Exception {
        return selectList("ScreenReviewDAO.selectSummaryList", params);
    }

    /** 검수 현황 {tenantId, menuId}. 없으면 null(미검수) */
    public ScreenReviewVO selectReview(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.selectReview", params);
    }

    /** 저장 전에 현황 줄을 잠그고 읽는다 {tenantId, menuId} */
    public ScreenReviewVO selectReviewForUpdate(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.selectReviewForUpdate", params);
    }

    /** 현황 줄이 없으면 미검수로 만든다 {tenantId, menuId, empId} */
    public int insertReviewIfAbsent(Map<String, Object> params) throws Exception {
        return insert("ScreenReviewDAO.insertReviewIfAbsent", params);
    }

    /** 상태 · 검수자 · 검수일 · 요청일 {reviewId, status, empId, reviewDate, requestDate, resetCycle}. resetCycle 이면 개발담당 · 개발완료일도 비운다 */
    public int updateReview(Map<String, Object> params) throws Exception {
        return update("ScreenReviewDAO.updateReview", params);
    }

    /** 그 화면의 다음 요청 번호(없으면 1). 검수현황 줄을 잠근 뒤 부른다 {reviewId} */
    public Integer selectNextRequestNo(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.selectNextRequestNo", params);
    }

    /** 이력 한 줄을 넣고 번호를 돌려준다 {tenantId, reviewId, fromStatus, toStatus, reviewComment, empId, reviewDate, requestNo} */
    public Long insertHistory(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.insertHistory", params);
    }

    /** 이력 목록(최근 것부터) {tenantId, reviewId} */
    public List<ScreenReviewHistoryVO> selectHistoryList(Map<String, Object> params) throws Exception {
        return selectList("ScreenReviewDAO.selectHistoryList", params);
    }

    /** 내 임시저장 {tenantId, menuId, empId}. 없으면 null */
    public ScreenReviewDraftVO selectDraft(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.selectDraft", params);
    }

    /** 임시저장(있으면 덮어쓴다). 번호를 돌려준다 {tenantId, menuId, empId, reviewComment} */
    public Long upsertDraft(Map<String, Object> params) throws Exception {
        return selectOne("ScreenReviewDAO.upsertDraft", params);
    }

    public int deleteDraft(Map<String, Object> params) throws Exception {
        return delete("ScreenReviewDAO.deleteDraft", params);
    }

    /** 첨부 목록 {tenantId, ownerType, ownerIds} */
    public List<ScreenReviewFileVO> selectFileList(Map<String, Object> params) throws Exception {
        return selectList("ScreenReviewDAO.selectFileList", params);
    }

    /** 임시저장 첨부를 이력으로 옮긴다 {tenantId, draftId, historyId} */
    public int moveDraftFiles(Map<String, Object> params) throws Exception {
        return update("ScreenReviewDAO.moveDraftFiles", params);
    }
}
