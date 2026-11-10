package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 점검표 한 장 VO (송연 /api/qsurvey/blank · /records/{id}).
 * 빈 장이면 recordId 가 없고 그 기간에 이미 쓴 장을 existing* 로 알린다. 쓴 장이면 그때의 판 · 답 · 상태를 담는다
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "HACCP(선행) 점검표 한 장 VO")
@Getter
@Setter
public class SurveySheetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer recordId;
    private Integer formId;
    private String formName;
    private String category;
    private String bindType;
    private String cycle;
    /** 기간 이름(예: 2026년 45주차 (11.2~11.8)), 수시는 빈 값 */
    private String period;
    private Integer versionId;
    private String versionLabel;
    private List<SurveyChoiceVO> choices = new ArrayList<>();
    private boolean hasNote;
    private boolean hasDefect;
    /** 보기 하나라도 점수가 있으면 점수를 매긴다 */
    private boolean scoring;
    /** 한 질문의 최고 점수 */
    private int fullMark;
    private List<SurveyItemVO> items = new ArrayList<>();
    /** 줄 번호 → 답 */
    private Map<String, SurveyAnswerInputVO> answers = new LinkedHashMap<>();
    private String docDate;
    private Integer bindId;
    private String bindName;
    private String clientCode;
    /** 빈 장: 그 기간에 이미 쓴 장 */
    private Integer existingId;
    private String existingStatus;
    private String existingDate;
    /** 쓴 장 */
    private String status;
    private Integer score;
    private Integer scoreMax;
    private String writtenBy;
    private String writtenByNm;
    private String writtenAt;
    private String rejectReason;
}
