package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 양식의 판 VO (송연 qdoc_version)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "양식의 판 VO (송연 qdoc_version)")
@Getter
@Setter
public class SurveyVersionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private Integer formId;
    private String label;
    private String memo;
    private String createdBy;
    private String surveyJson;
}
