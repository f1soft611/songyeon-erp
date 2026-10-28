package egovframework.let.ha.hr.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 연차 쓴 날 한 줄 VO 클래스 (송연 leave_records)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 연차 쓴 날 한 줄 VO 클래스")
@Getter
@Setter
public class HrLeaveRecordVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String employeeId;
    private String leaveDate;
    private Double days;
    private String note;
    private String createdAt;
    private String createdBy;
}
