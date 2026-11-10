package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 고를 답 VO (판 survey_json.choices). score 가 null 이면 점수를 안 매긴다
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "고를 답 VO (판 survey_json.choices). score 가 null 이면 점수를 안 매긴다")
@Getter
@Setter
public class SurveyChoiceVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String label;
    private String mark;
    private Integer score;
}
