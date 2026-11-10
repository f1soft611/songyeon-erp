package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 보기 · 칸 저장 요청 VO (송연 save_choices)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "보기 · 칸 저장 요청 VO (송연 save_choices)")
@Getter
@Setter
public class SurveyChoicesSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<SurveyChoiceInputVO> choices = new ArrayList<>();
    private Boolean hasNote;
    private Boolean hasDefect;
}
