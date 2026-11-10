package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 설문형 양식과 지금 쓰는 판 VO (송연 qdoc_form + qdoc_version is_current)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "설문형 양식과 지금 쓰는 판 VO (송연 qdoc_form + qdoc_version is_current)")
@Getter
@Setter
public class SurveyFormRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private String name;
    private String category;
    /** NULL(날짜마다) / client(거래처마다) */
    private String bindType;
    private Integer active;
    private String cycle;
    private Integer versionId;
    private String versionLabel;
    /** 판의 보기 · 점수 · 칸(JSON) */
    private String surveyJson;
    /** 지금 판의 질문 수 */
    private Integer questions;
    /** 양식 목록: 묶음 수 · 쓴 장 수 · 만점(질문 수 × 최고 점수, 점수 없는 양식은 null) */
    private Integer groups;
    private Integer records;
    private Integer scoreMax;
}
