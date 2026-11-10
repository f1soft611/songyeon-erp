package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 점검표에서 받은 답 VO (value 고른 보기 · note 세부내역 · defect 부적합내역)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "점검표에서 받은 답 VO (value 고른 보기 · note 세부내역 · defect 부적합내역)")
@Getter
@Setter
public class SurveyAnswerInputVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String value;
    private String note;
    private String defect;
}
