package egovframework.let.pu.order.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 발주 여러 건 등록 요청 VO 클래스 (송연 POST /api/materials/purchase-order/bulk)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "발주 등록 요청")
@Getter
@Setter
public class PurchaseOrderBulkRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "발주일(품목에 발주일이 없을 때 다 같이 쓴다)")
    private String orderDate;
    @Schema(description = "어디서 만든 발주인가(수불대장이면 ledger)")
    private String source;
    private List<PurchaseOrderItemVO> items;
}
