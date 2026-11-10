package egovframework.let.qm.haccp.prerequisite.service;

import java.util.List;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyFormRowVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyMissingVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyRecordVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveRequestVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySaveResultVO;
import egovframework.let.qm.haccp.prerequisite.domain.model.SurveySheetVO;

/**
 * 품질관리 - HACCP(선행) 서비스 인터페이스 (송연 qsurvey.py). 2026-11-09 점검표 열기 · 임시저장 · 현황(결재는 방식 미정)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
public interface PrerequisiteService {

    /** 쓸 서류 */
    List<SurveyFormRowVO> listPickForms() throws Exception;

    /** 빈 점검표(그 기간에 이미 쓴 장을 함께 알린다). 거래처마다 서류면 clientCode 필수 */
    SurveySheetVO blank(int formId, String docDate, String clientCode) throws Exception;

    /** 임시저장(상태 작성중). employeeId = 저장한 사람 사번 */
    SurveySaveResultVO save(SurveySaveRequestVO request, String employeeId) throws Exception;

    /** 현황 목록. 기간은 start · end 가 둘 다 있을 때만 */
    List<SurveyRecordVO> listRecords(String start, String end, Integer formId) throws Exception;

    /** 쓴 장 한 장(그때의 판으로) */
    SurveySheetVO getRecord(int recordId) throws Exception;

    /** 안 쓴 기간(오늘 기준) */
    List<SurveyMissingVO> missing() throws Exception;
}
