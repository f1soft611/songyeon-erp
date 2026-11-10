package egovframework.let.qm.haccp.prerequisite.service;

import java.util.List;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoicesSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormCreateResultVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormDetailVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemSaveVO;

/**
 * 품질관리 - HACCP(선행) 양식 만들기 서비스 인터페이스 (송연 qsurvey.py 양식 · 판 · 줄). 2026-11-09
 * 이미 쓴 판은 고치지 않는다 — 질문 · 묶음 · 보기를 고치면 새 판을 뜨고 거기를 고친다
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
public interface PrerequisiteFormService {

    List<SurveyFormRowVO> listForms() throws Exception;

    SurveyFormCreateResultVO createForm(SurveyFormSaveVO request, String employeeId) throws Exception;

    SurveyFormDetailVO getForm(int formId) throws Exception;

    /** 제목 · 분류 · 대상 · 기간(판은 안 뜬다) */
    void updateForm(int formId, SurveyFormSaveVO request) throws Exception;

    /** 목록에서 내리기 · 다시 올리기 */
    void setActive(int formId, boolean active) throws Exception;

    /** 보기 · 칸 저장 → 고친 판 번호 */
    int saveChoices(int formId, SurveyChoicesSaveVO request, String employeeId) throws Exception;

    /** 줄 넣기 → 새 줄 번호 */
    int addItem(int formId, SurveyItemSaveVO request, String employeeId) throws Exception;

    /** 줄 고치기 → 고친 줄 번호(새 판이면 새 번호) */
    int updateItem(int itemId, SurveyItemSaveVO request, String employeeId) throws Exception;

    /** 줄 지우기(묶음이면 안의 줄까지) → 지운 줄 수 */
    int deleteItem(int itemId, String employeeId) throws Exception;

    /** 줄 옮기기(dir: up / down) → 옮겼는가 */
    boolean moveItem(int itemId, String dir, String employeeId) throws Exception;
}
