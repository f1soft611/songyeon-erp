package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 점검한 거래처 VO (clients)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "점검한 거래처 VO (clients)")
@Getter
@Setter
public class SurveyClientVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private String clientCode;
    private String name;
}
