package egovframework.let.ha.accbasic.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 계정과목 VO 클래스 (송연 acc_subject. 저장 요청도 같은 모양, active 는 1 · 0)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 계정과목 VO 클래스")
@Getter
@Setter
public class AccSubjectVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String code;
    private String name;
    private String category;
    private String direction;
    private String note;
    private Object active;
    private Integer sortOrder;
}
