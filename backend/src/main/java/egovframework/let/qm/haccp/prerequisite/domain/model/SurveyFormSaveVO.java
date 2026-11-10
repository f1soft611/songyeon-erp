package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 양식 만들기 · 고치기 요청 VO (송연 create_form · update_form). copyFrom = 질문을 베낄 서류 번호
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "양식 만들기 · 고치기 요청 VO (송연 create_form · update_form). copyFrom = 질문을 베낄 서류 번호")
@Getter
@Setter
public class SurveyFormSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private String name;
    /** 외부감사 / 내부감사 / 일반 */
    private String category;
    /** '' 날짜마다 / client 거래처마다 */
    private String bindType;
    private String cycle;
    private Integer copyFrom;
    /** 만든 사람 사번(서버가 넣는다) */
    private String createdBy;
}
