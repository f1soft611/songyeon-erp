package egovframework.let.co.schedule.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 공통관리 - 물류스케줄 한 줄 VO 클래스 (보기 전용).
 * source = manual(출하등록 줄) | production(물류출고일이 있는 생산확정 줄). 출고량은 실출하량이 있으면 그것, 없으면 예정량
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "물류스케줄")
@Getter
@Setter
public class LogisticsScheduleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "manual | production")
    private String source;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "품목명(규격)")
    private String productName;

    @Schema(description = "출고량")
    private String orderQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "실출하량이 적혔으면 출하완료")
    private Boolean shipped;
}
