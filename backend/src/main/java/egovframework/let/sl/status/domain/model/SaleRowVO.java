package egovframework.let.sl.status.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 판매현황·토탈집계 한 줄 VO 클래스 (송연 sales.py _sales_record_rows · _receipt_rows).
 * 판매현황은 적어둔 판매(sales_record)만, 토탈집계는 생산입고(들어온 것)와 판매(나간 것)를 한 표에 펴놓는다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "판매현황·토탈집계 한 줄")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SaleRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "판매 ID(생산입고 줄은 없음)")
    private Long id;
    @Schema(description = "판매일자(판매현황) · 일자(토탈집계)")
    private String saleDate;
    private String clientName;
    private String productName;
    private Double qty;
    private Double unitPrice;
    private Double amount;
    private String note;
    @Schema(description = "manual | logistics | production")
    private String sourceType;
    private String createdBy;
    @Schema(description = "들어온 곳: 직접등록 · 출하확정 · 생산입고")
    private String sourceLabel;
    @Schema(description = "토탈집계 구분: in(입고) | out(출고)")
    private String direction;
    @Schema(description = "입고 · 출고")
    private String directionLabel;

    // 생산입고 줄의 실생산량 글자('980kg')
    @JsonIgnore
    private String qtyText;
}
