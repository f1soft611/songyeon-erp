package egovframework.let.lg.confirm.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 용차 금액 확인 VO 클래스 (기간 안 확정된 출하 중 용차를 쓴 것과 합계)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "용차 금액 확인")
@Getter
@Setter
public class CharterSummaryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "일자 순 용차 사용 내역(scheduleDate · charterInfo · charterAmount)")
    private List<ShipConfirmVO> rows;

    @Schema(description = "용차 합계금액")
    private Double totalAmount;
}
