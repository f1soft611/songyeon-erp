package egovframework.let.lg.confirm.domain.model;

import java.io.Serializable;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 출하확정 한 줄 VO 클래스 (송연 LG0002DTO).
 * 출하 목록은 두 곳에서 온다: source=manual — 출하등록에서 넣은 줄(logistics_schedule),
 * source=production — 물류출고일이 적힌 생산확정 줄(production_schedule, 그 줄 자신이 로트).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "출하확정 한 줄")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ShipConfirmVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    @Schema(description = "manual(출하등록) | production(물류출고일이 적힌 생산확정 줄)")
    private String source;
    @Schema(description = "출고일")
    private String scheduleDate;
    private String clientName;
    @Schema(description = "품목명(규격)")
    private String productName;
    @Schema(description = "실출하량이 있으면 그것, 없으면 예정량")
    private String orderQty;
    @Schema(description = "출하예정량")
    private String plannedQty;
    @Schema(description = "실출하량")
    private String actualQty;
    private String note;
    @Schema(description = "특이사항")
    private String shipNote;
    private Long lotId;
    @Schema(description = "배차")
    private String vehicle;
    private String packingMethod;
    @Schema(description = "순서")
    private Integer visitOrder;
    @Schema(description = "운행자")
    private String driverName;
    @Schema(description = "운행자 사번(2026-10-26 저장하는 값)")
    private String driverId;
    private String charterInfo;
    private Double charterAmount;
    private Integer shipConfirmed;
    private Double boxQty;
    private Integer sortOrder;
    private String createdAt;
    @Schema(description = "제조일자(로트의 생산일)")
    private String lotDate;
    private String lotNo;
    @Schema(description = "그 로트의 실생산량(없으면 아직 생산입고 전)")
    private String lotActualQty;
    private String lotPlannedQty;
    @Schema(description = "로트 배분(한 줄을 로트 여러 개로 나눠 적은 것)")
    private transient List<ShipLotAllocationVO> lotAllocations;
    @Schema(description = "보관방법(제품BOM)")
    private String storage;
    @Schema(description = "지금 제품 재고")
    private Double stockQty;
    @Schema(description = "실출하량이 적혀 있는가")
    private Boolean shipped;

    // 재고를 움직일 때만 쓰는 값
    @JsonIgnore
    private String productCode;
    @JsonIgnore
    private String movedOn;
    @JsonIgnore
    private String logisticsActualQty;
    @JsonIgnore
    private String name;
    @JsonIgnore
    private String spec;
}
