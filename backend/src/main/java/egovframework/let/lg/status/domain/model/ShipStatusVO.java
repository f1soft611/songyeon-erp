package egovframework.let.lg.status.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 출하현황 한 줄 VO 클래스 (송연 LG0003DTO). 출하확정된 기록(출하등록 줄 · 물류출고일이 적힌 생산확정 줄).
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "출하현황 한 줄")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ShipStatusVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    @Schema(description = "logistics(출하등록 줄) | production(생산확정 줄)")
    private String scheduleType;
    @Schema(description = "출고일")
    private String scheduleDate;
    private String clientName;
    @Schema(description = "품목명(규격)")
    private String productName;
    @Schema(description = "실제로 나간 양(실출하량이 없으면 예정량)")
    private String orderQty;
    @Schema(description = "배차")
    private String vehicle;
    private String packingMethod;
    @Schema(description = "특이사항")
    private String shipNote;
    @Schema(description = "순서")
    private Integer visitOrder;
    @Schema(description = "운행자")
    private String driverName;
    @Schema(description = "보관방법(제품)")
    private String storage;
    @Schema(description = "금액만 다른 때로 넘긴(이월) 건인가")
    private Boolean carriedOver;
    @Schema(description = "넘긴 양 합계")
    private Double carryoverQty;
    @Schema(description = "'이월(2026-10-05, 2026-11)' — 넘긴 때를 모은 글자")
    private String carryoverLabel;

    // 이월 기록(delivery_carryover)·제품 보관방법을 읽을 때만 쓰는 값
    @JsonIgnore
    private Long scheduleId;
    @JsonIgnore
    private Double qty;
    @JsonIgnore
    private String targetMonth;
    @JsonIgnore
    private String targetDate;
    @JsonIgnore
    private String name;
    @JsonIgnore
    private String spec;
}
