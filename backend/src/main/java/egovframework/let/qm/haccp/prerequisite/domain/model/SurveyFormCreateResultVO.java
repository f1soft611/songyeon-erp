package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 새 서류 결과 VO (copied = 베낀 줄 수, 묶음 포함)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "새 서류 결과 VO (copied = 베낀 줄 수, 묶음 포함)")
@Getter
@Setter
public class SurveyFormCreateResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int id;
    private int copied;
}
