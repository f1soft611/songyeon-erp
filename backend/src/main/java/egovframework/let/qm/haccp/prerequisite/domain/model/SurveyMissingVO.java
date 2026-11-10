package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 안 쓴 기간 VO (서류마다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "안 쓴 기간 VO (서류마다)")
@Getter
@Setter
public class SurveyMissingVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer formId;
    private String formName;
    private String cycle;
    private String bindType;
    private List<SurveyMissingRowVO> rows = new ArrayList<>();
}
