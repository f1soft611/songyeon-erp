package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 답 한 칸 VO (송연 qdoc_answer)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "답 한 칸 VO (송연 qdoc_answer)")
@Getter
@Setter
public class SurveyAnswerVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer recordId;
    private Integer itemId;
    /** 고른 보기 이름 */
    private String valueText;
    /** 세부내역 */
    private String note;
    /** 부적합내역 */
    private String defect;
}
