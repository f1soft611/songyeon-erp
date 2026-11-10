package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 점검표 임시저장 요청 VO. answers 키는 줄 번호(qdoc_item.id)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "점검표 임시저장 요청 VO. answers 키는 줄 번호(qdoc_item.id)")
@Getter
@Setter
public class SurveySaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer formId;
    private String docDate;
    /** 거래처마다 서류: 거래처코드(clients.client_code) */
    private String clientCode;
    private Map<String, SurveyAnswerInputVO> answers;
}
