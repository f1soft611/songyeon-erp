package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 쓴 점검표 한 장 VO (송연 qdoc_record + 양식 · 판 · 거래처 · 쓴 사람 이름)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "쓴 점검표 한 장 VO (송연 qdoc_record + 양식 · 판 · 거래처 · 쓴 사람 이름)")
@Getter
@Setter
public class SurveyRecordVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private Integer formId;
    private Integer versionId;
    private String bindType;
    private Integer bindId;
    private String docDate;
    /** 작성중 / 검토대기 / 승인 / 반려 */
    private String status;
    private Integer score;
    private Integer scoreMax;
    /** 쓴 사람 사번 · 이름 */
    private String writtenBy;
    private String writtenByNm;
    private String writtenAt;
    /** 결재를 끝낸 사람 사번 · 이름 */
    private String approvedBy;
    private String approvedByNm;
    private String approvedAt;
    private String rejectReason;
    private String formName;
    private String category;
    private String cycle;
    /** 기간 이름(서비스가 만든다, 수시는 빈 값) */
    private String period;
    private String versionLabel;
    /** 판의 보기 · 점수(JSON) — 응답에는 안 쓴다 */
    @JsonIgnore
    private String surveyJson;
    /** 거래처 이름 · 코드 */
    private String bindName;
    private String clientCode;
}
