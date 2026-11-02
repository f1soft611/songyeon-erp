package egovframework.let.lg.outbound.shipconfirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 > 출고관리 > 출하확정 운행자 고르기 후보(직원)
 * 2026-10-30 운행자 칸을 콤보에서 사원 팝업으로 바꿨다. 팝업은 사번 · 이름 · 부서를 보여 주고 사번으로 저장한다
 * @author SONGYEON ERP
 * @since 2026.10.30
 * @version 1.0
 */
@Getter
@Setter
@Schema(description = "운행자 후보(직원)")
public class DriverOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사번")
    private String employeeId;
    @Schema(description = "이름")
    private String name;
    @Schema(description = "부서")
    private String department;
}
