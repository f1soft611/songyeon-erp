package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 보기 저장 요청의 보기 한 줄 VO (점수는 글로 받아 숫자인지 본다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "보기 저장 요청의 보기 한 줄 VO (점수는 글로 받아 숫자인지 본다)")
@Getter
@Setter
public class SurveyChoiceInputVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String label;
    private String mark;
    private String score;
}
