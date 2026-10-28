package egovframework.let.ha.hr.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 사원별 연차 갯수·사용·잔여 VO 클래스 (송연 /api/hr/leave 한 줄. 셀 수 없으면 countable=false 와 그 까닭)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 사원별 연차 갯수·사용·잔여 VO 클래스")
@Getter
@Setter
public class HrLeaveSummaryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String employeeId;
    private String name;
    private String department;
    private String position;
    private String hireDate;
    private String resignDate;
    private boolean countable;
    private String reason;
    private Integer yearsOfService;
    private String yearStart;
    private String yearEnd;
    private Double entitledDays;
    private Boolean accruing;
    private Double usedDays;
    private Double remainingDays;
}
