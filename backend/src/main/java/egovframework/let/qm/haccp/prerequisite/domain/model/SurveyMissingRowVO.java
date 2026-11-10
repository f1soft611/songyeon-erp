package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 안 쓴 기간 한 칸 VO (기간 이름 또는 업체 이름)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "안 쓴 기간 한 칸 VO (기간 이름 또는 업체 이름)")
@Getter
@Setter
public class SurveyMissingRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String label;
    private String start;
    private String end;
    /** 거래처마다 서류: 이번 기간 이름 */
    private String period;
    /** 거래처마다 서류: clients.id */
    private Integer clientId;
}
