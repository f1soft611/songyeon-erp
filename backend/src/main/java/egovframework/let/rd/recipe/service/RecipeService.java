package egovframework.let.rd.recipe.service;

import java.util.List;
import java.util.Map;

import egovframework.let.rd.recipe.domain.model.RecipeClientVO;
import egovframework.let.rd.recipe.domain.model.RecipeDraftVO;
import egovframework.let.rd.recipe.domain.model.RecipeSalesRepVO;
import egovframework.let.rd.recipe.domain.model.RecipeSaveVO;
import egovframework.let.rd.recipe.domain.model.RecipeStageLogVO;

/**
 * 상품개발 - 레시피 작성 서비스 인터페이스 (송연 recipe.py)
 * 업체 폴더 → 레시피 → 버전(초안, test1, test2 …)을 쌓아가며 배합표를 고친다.
 * 공유(넘기기)된 버전은 잠긴다 — 이미 남에게 건네진 내용이 나중에 몰래 바뀌면 안 된다. 고치려면 새 test 버전을 만든다.
 * 송연은 열람·다운로드·작성 등급을 따졌지만 이 프로젝트는 권한 개념이 없어 누구나 작성 등급으로 본다.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
public interface RecipeService {

    List<RecipeClientVO> listClients() throws Exception;

    /** 업체 폴더 만들기 또는 영업담당자 바꾸기(담당자는 비워도 된다). 업체명을 돌려준다 */
    String saveClient(String clientName, String salesEmpId, String employeeId) throws Exception;

    List<RecipeSalesRepVO> listSalesReps() throws Exception;

    /** 레시피 목록. stage 를 주면 그 분류로 잠긴 '버전' 단위 */
    List<RecipeDraftVO> listDrafts(Map<String, String> filter) throws Exception;

    /** 레시피 한 건 {draft, versions} */
    Map<String, Object> getDraft(long id) throws Exception;

    /** 버전 한 개 {version, bom} */
    Map<String, Object> getVersion(long id) throws Exception;

    /** 새 레시피: 머리 정보 + '초안' 버전 + 배합표 → {id, versionId} */
    Map<String, Object> createDraft(RecipeSaveVO request, String employeeId) throws Exception;

    /** 머리 정보(이름·규격·메모·카테고리·판매유형·비고) 고치기. 업체명은 바꾸지 않는다 */
    void updateDraft(long id, RecipeSaveVO request) throws Exception;

    /** test 버전 추가: 최신 버전의 배합표를 베껴 시작(늘 잠기지 않은 채로) → {versionId, versionLabel} */
    Map<String, Object> addVersion(long draftId, String note) throws Exception;

    /** 버전의 배합표를 통째로 다시 적는다. 잠긴 버전은 막는다 */
    void saveVersion(long versionId, RecipeSaveVO request, String note) throws Exception;

    /** 레시피를 버전·배합표·공유·공유로그까지 지운다 */
    void deleteDraft(long id) throws Exception;

    List<RecipeStageLogVO> stageLogs(long draftId) throws Exception;
}
