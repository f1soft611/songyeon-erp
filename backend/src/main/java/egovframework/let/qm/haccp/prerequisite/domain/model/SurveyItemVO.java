package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 판에 달린 줄 VO (송연 qdoc_item). depth · questions 는 서비스가 센다
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "판에 달린 줄 VO (송연 qdoc_item). depth · questions 는 서비스가 센다")
@Getter
@Setter
public class SurveyItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private Integer parentId;
    /** group(묶음) / single(질문) */
    private String rowKind;
    private String label;
    /** 관리항목 */
    private String topic;
    /** 1 꼭 답해야 함 / 0 비워도 됨 */
    private Integer required;
    private Integer sortOrder;
    private Integer depth;
    /** 묶음 아래 질문 수(작은 묶음 것 포함) */
    private Integer questions;
    /** 양식 만들기: 판 · 서류 번호와 베낄 때 옮기는 칸 */
    private Integer versionId;
    private Integer formId;
    private String answerType;
    private Integer hasNote;
    private Integer hasDefect;
    private String optionsJson;
    private String scoreJson;
}
