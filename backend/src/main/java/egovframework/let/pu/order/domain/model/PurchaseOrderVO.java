package egovframework.let.pu.order.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 발주 한 건 VO 클래스 (송연 material_purchase_order).
 * 발주에는 단가를 받지 않는다 — 표에 금액이 적혀 있으면 사람은 그것을 확정 금액으로 읽는다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "발주 한 건")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PurchaseOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    @Schema(description = "원재료 코드")
    private String materialCode;
    @Schema(description = "원재료명(발주할 때의 이름)")
    private String materialName;
    private Double qty;
    @Schema(description = "발주일")
    private String orderDate;
    @Schema(description = "매입 거래처")
    private String clientName;
    @Schema(description = "매입 거래처코드(2026-10-26 material_purchase_order 에 저장하는 값)")
    private String clientCode;
    @Schema(description = "입고가 연결됐는가(입고된 발주는 취소할 수 없다)")
    private Boolean received;

    // 등록할 때만 쓰는 값
    private String createdAt;
    @Schema(description = "어디서 만든 발주인가(수불대장이면 ledger, 발주등록 창이면 비움)")
    private String source;
    @Schema(description = "필요일(수불대장에서 넘어온 발주)")
    private String needDate;
}
