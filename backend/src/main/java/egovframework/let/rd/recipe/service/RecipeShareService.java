package egovframework.let.rd.recipe.service;

import java.util.List;
import java.util.Map;

import egovframework.let.rd.recipe.domain.model.RecipeHandoffVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeShareVO;

/**
 * 상품개발 - 레시피 검색·공유 · 공유 로그 서비스 인터페이스 (송연 recipe.py 의 recipe-handoffs · recipe-shares)
 * 넘기기: 레시피의 한 버전을 확정·견적(영업관리 > 견적의 가견적) 또는 기타(품질관리 > 라벨등록 > 표시사항 요청)로 넘기고 그 버전을 잠근다.
 * 공유: 사원에게 레시피 한 버전을 만료일까지 보여준다(버전을 못박아 둔다).
 * 송연은 넘기기는 작성 등급, 공유 관리는 관리자만 했지만 이 프로젝트는 권한 개념이 없어 누구나 한다.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
public interface RecipeShareService {

    /** 넘기기 → {handoffId, quoteId, message} */
    Map<String, Object> handoff(Object versionId, String kind, String employeeId, String employeeName) throws Exception;

    /** 공유 로그(넘긴 기록). draftId · kind · start · end 로 거른다 */
    List<RecipeHandoffVO> listHandoffs(Map<String, String> filter) throws Exception;

    /** 공유 목록(만료 여부 포함) */
    List<RecipeShareVO> listShares() throws Exception;

    void createShare(RecipeShareSaveVO request, String employeeId) throws Exception;

    /** 회수: 즉시 조회가 안 되게 지운다 */
    void deleteShare(long id) throws Exception;
}
