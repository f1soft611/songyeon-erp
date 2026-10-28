package egovframework.let.common.inventory.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 공통 재고 - 제품 수불 원장 한 줄 VO 클래스 (송연 product_stock_movement).
 * 재고를 움직일 때 넘기는 부가 정보(제품명·일자·출처·거래처·비고·누가)로도 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "제품 수불 원장 한 줄")
@Getter
@Setter
public class ProductStockMovementVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "제품명(그때 이름, 비우면 제품 표의 이름(규격))")
    private String productName;

    @Schema(description = "일자(비우면 오늘)")
    private String movedOn;

    @Schema(description = "구분(생산입고·입고취소·생산정정·출하 …)")
    private String kind;

    @Schema(description = "수량(+ 들어옴, - 나감)")
    private Double qty;

    @Schema(description = "움직인 뒤 재고")
    private Double balanceAfter;

    @Schema(description = "일으킨 표")
    private String sourceTable;

    @Schema(description = "일으킨 줄 ID")
    private Long sourceId;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "누가(이름, 보여 줄 때)")
    private String createdByName;

    @Schema(description = "누가(사번, 2026-10-26 저장하는 값)")
    private String createdBy;

    @Schema(description = "기록 시각")
    private String createdAt;
}
