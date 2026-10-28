package egovframework.let.ha.hr.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 연차 등록 요청 VO 클래스 ({employeeId, leaveDate, days: 1 · 0.5, note})
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 연차 등록 요청 VO 클래스")
@Getter
@Setter
public class HrLeaveSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Object employeeId;
    private String leaveDate;
    private Object days;
    private String note;
}
