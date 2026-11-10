package egovframework.let.qm.haccp.prerequisite.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyAnswerVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyClientVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormSaveVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyRecordVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyVersionVO;

/**
 * 품질관리 - HACCP(선행) 데이터 접근 클래스 (송연 qsurvey.py: qdoc_form · qdoc_version · qdoc_item · qdoc_record · qdoc_answer, kind = 설문형)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Repository("prerequisiteDAO")
public class PrerequisiteDAO extends EgovAbstractMapper {

    private static Map<String, Object> params(Object... kv) {
        Map<String, Object> p = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            p.put((String) kv[i], kv[i + 1]);
        }
        return p;
    }

    /** 쓸 서류: 살아 있고 지금 판에 질문이 있는 설문형 양식 */
    public List<SurveyFormRowVO> selectPickForms() throws Exception {
        return selectList("PrerequisiteDAO.selectPickForms");
    }

    /** 설문형 양식 하나와 지금 판(없으면 null) */
    public SurveyFormRowVO selectSurveyForm(int formId) throws Exception {
        return selectOne("PrerequisiteDAO.selectSurveyForm", formId);
    }

    public List<SurveyItemVO> selectItems(int versionId) throws Exception {
        return selectList("PrerequisiteDAO.selectItems", versionId);
    }

    public SurveyClientVO selectClientByCode(String clientCode) throws Exception {
        return selectOne("PrerequisiteDAO.selectClientByCode", clientCode);
    }

    public String selectClientName(int clientId) throws Exception {
        return selectOne("PrerequisiteDAO.selectClientName", clientId);
    }

    /** 그 기간에 이미 쓴 장(같은 서류 · 같은 대상). 가장 나중 것 */
    public SurveyRecordVO selectRecordInPeriod(int formId, int bindId, String start, String end) throws Exception {
        return selectOne("PrerequisiteDAO.selectRecordInPeriod", params("formId", formId, "bindId", bindId, "start", start, "end", end));
    }

    /** 수시 서류: 같은 날 · 같은 대상 장 */
    public SurveyRecordVO selectRecordOnDate(int formId, int bindId, String docDate) throws Exception {
        return selectOne("PrerequisiteDAO.selectRecordOnDate", params("formId", formId, "bindId", bindId, "docDate", docDate));
    }

    public void insertRecord(SurveyRecordVO record) throws Exception {
        insert("PrerequisiteDAO.insertRecord", record);
    }

    public void updateRecord(SurveyRecordVO record) throws Exception {
        update("PrerequisiteDAO.updateRecord", record);
    }

    public void deleteAnswers(int recordId) throws Exception {
        delete("PrerequisiteDAO.deleteAnswers", recordId);
    }

    public void insertAnswer(SurveyAnswerVO answer) throws Exception {
        insert("PrerequisiteDAO.insertAnswer", answer);
    }

    /** 현황 목록. start · end 가 null 이면 기간 없음, formId 가 null 이면 서류 전체. 최대 300줄 */
    public List<SurveyRecordVO> selectRecords(String start, String end, Integer formId) throws Exception {
        return selectList("PrerequisiteDAO.selectRecords", params("start", start, "end", end, "formId", formId));
    }

    /** 쓴 장 한 장(그때의 판) */
    public SurveyRecordVO selectRecord(int recordId) throws Exception {
        return selectOne("PrerequisiteDAO.selectRecord", recordId);
    }

    public List<SurveyAnswerVO> selectAnswers(int recordId) throws Exception {
        return selectList("PrerequisiteDAO.selectAnswers", recordId);
    }

    /** 안 쓴 기간을 볼 서류: 살아 있고 질문이 있는 설문형(수시는 서비스가 뺀다) */
    public List<SurveyFormRowVO> selectMissingForms() throws Exception {
        return selectList("PrerequisiteDAO.selectPickForms");
    }

    public int countRecordsBetween(int formId, String start, String end) throws Exception {
        Integer n = selectOne("PrerequisiteDAO.countRecordsBetween", params("formId", formId, "start", start, "end", end));
        return n == null ? 0 : n;
    }

    /** 그 날짜 전에 평가한 업체(clients.id) */
    public List<Integer> selectBindIdsBefore(int formId, String before) throws Exception {
        return selectList("PrerequisiteDAO.selectBindIdsBefore", params("formId", formId, "before", before));
    }

    /** 그 기간에 평가한 업체(clients.id) */
    public List<Integer> selectBindIdsBetween(int formId, String start, String end) throws Exception {
        return selectList("PrerequisiteDAO.selectBindIdsBetween", params("formId", formId, "start", start, "end", end));
    }

    // ---------------------------------------------------------------- 양식 만들기(2026-11-09)

    /** 양식 목록(살아 있는 것 먼저): 지금 판 · 질문 수 · 묶음 수 · 쓴 장 수 */
    public List<SurveyFormRowVO> selectForms() throws Exception {
        return selectList("PrerequisiteDAO.selectForms");
    }

    /** 같은 이름 서류 수(excludeId 는 빼고). 기록형 · 설문형을 가리지 않는다(원본과 같음) */
    public int countFormName(String name, Integer excludeId) throws Exception {
        Integer n = selectOne("PrerequisiteDAO.countFormName", params("name", name, "excludeId", excludeId));
        return n == null ? 0 : n;
    }

    public void insertForm(SurveyFormSaveVO form) throws Exception {
        insert("PrerequisiteDAO.insertForm", form);
    }

    public void updateForm(SurveyFormSaveVO form) throws Exception {
        update("PrerequisiteDAO.updateForm", form);
    }

    public void updateFormActive(int formId, int active) throws Exception {
        update("PrerequisiteDAO.updateFormActive", params("formId", formId, "active", active));
    }

    public int countRecordsByForm(int formId) throws Exception {
        Integer n = selectOne("PrerequisiteDAO.countRecordsByForm", formId);
        return n == null ? 0 : n;
    }

    public int countRecordsByVersion(int versionId) throws Exception {
        Integer n = selectOne("PrerequisiteDAO.countRecordsByVersion", versionId);
        return n == null ? 0 : n;
    }

    public int countVersions(int formId) throws Exception {
        Integer n = selectOne("PrerequisiteDAO.countVersions", formId);
        return n == null ? 0 : n;
    }

    public SurveyVersionVO selectCurrentVersion(int formId) throws Exception {
        return selectOne("PrerequisiteDAO.selectCurrentVersion", formId);
    }

    public void insertVersion(SurveyVersionVO version) throws Exception {
        insert("PrerequisiteDAO.insertVersion", version);
    }

    /** 그 서류의 판을 모두 '지금 판 아님' 으로 */
    public void clearCurrentVersion(int formId) throws Exception {
        update("PrerequisiteDAO.clearCurrentVersion", formId);
    }

    public void updateVersionSurvey(int versionId, String surveyJson) throws Exception {
        update("PrerequisiteDAO.updateVersionSurvey", params("versionId", versionId, "surveyJson", surveyJson));
    }

    /** 판을 베낄 때: 줄의 모든 칸 */
    public List<SurveyItemVO> selectItemsForCopy(int versionId) throws Exception {
        return selectList("PrerequisiteDAO.selectItemsForCopy", versionId);
    }

    public void insertItem(SurveyItemVO item) throws Exception {
        insert("PrerequisiteDAO.insertItem", item);
    }

    /** 설문형 서류의 줄 하나(판 · 서류 번호 포함). 없으면 null */
    public SurveyItemVO selectItem(int itemId) throws Exception {
        return selectOne("PrerequisiteDAO.selectItem", itemId);
    }

    /** 그 판에서 그 자리(sort_order)의 줄 번호 */
    public Integer selectItemIdBySort(int versionId, int sortOrder) throws Exception {
        return selectOne("PrerequisiteDAO.selectItemIdBySort", params("versionId", versionId, "sortOrder", sortOrder));
    }

    /** 그 자리 뒤 줄들의 자리를 하나씩 민다 */
    public void shiftItemsAfter(int versionId, int sortOrder) throws Exception {
        update("PrerequisiteDAO.shiftItemsAfter", params("versionId", versionId, "sortOrder", sortOrder));
    }

    public int maxItemSort(int versionId) throws Exception {
        Integer n = selectOne("PrerequisiteDAO.maxItemSort", versionId);
        return n == null ? 0 : n;
    }

    public void updateItem(int itemId, String label, String topic, int required) throws Exception {
        update("PrerequisiteDAO.updateItem", params("itemId", itemId, "label", label, "topic", topic, "required", required));
    }

    public List<Integer> selectChildIds(int parentId) throws Exception {
        return selectList("PrerequisiteDAO.selectChildIds", parentId);
    }

    public void deleteItem(int itemId) throws Exception {
        delete("PrerequisiteDAO.deleteItem", itemId);
    }

    /** 같은 묶음 형제(parentId 가 null 이면 맨 위 줄들) */
    public List<SurveyItemVO> selectSiblings(int versionId, Integer parentId) throws Exception {
        return selectList("PrerequisiteDAO.selectSiblings", params("versionId", versionId, "parentId", parentId));
    }

    public void updateItemSort(int itemId, int sortOrder) throws Exception {
        update("PrerequisiteDAO.updateItemSort", params("itemId", itemId, "sortOrder", sortOrder));
    }
}
