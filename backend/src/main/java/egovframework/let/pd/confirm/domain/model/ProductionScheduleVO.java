package egovframework.let.pd.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 생산확정 한 줄 VO 클래스 (송연 production_schedule). 목록·저장·상태 확인에 같이 쓴다.
 * 생산지시량·실생산량은 '1,000kg' 처럼 단위가 붙은 글자다(송연과 같음).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "생산확정 한 줄")
@Getter
@Setter
public class ProductionScheduleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산확정 ID")
    private Long id;

    @Schema(description = "생산일자(생산예정일)")
    private String scheduleDate;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-26 production_schedule 에 저장하는 값)")
    private String clientCode;

    @Schema(description = "품목명(규격)")
    private String productName;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "생산지시량")
    private String orderQty;

    @Schema(description = "실생산량(생산입고에서 적는다)")
    private String actualQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "물류출고일")
    private String logisticsDate;

    @Schema(description = "가져온 수주 ID")
    private Long sourceOrderId;

    @Schema(description = "재고생산(1/0)")
    private Integer isStockProduction;

    @Schema(description = "로트번호(20260921-01)")
    private String lotNo;

    @Schema(description = "원재료 치환 건수")
    private Integer substitutionCount;

    @Schema(description = "출하확정(1/0)")
    private Integer shipConfirmed;

    @Schema(description = "같은 날 순서")
    private Integer sortOrder;

    @Schema(description = "확정 시각")
    private String createdAt;
}
