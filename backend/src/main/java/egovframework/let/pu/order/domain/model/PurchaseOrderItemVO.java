package egovframework.let.pu.order.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 발주 등록 요청의 품목 한 줄 VO 클래스. 수량은 숫자로 못 읽으면 그 품목을 건너뛴다(송연과 같음).
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "발주 등록 품목")
@Getter
@Setter
public class PurchaseOrderItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료 코드(원재료 표에 있어야 한다)")
    private String materialCode;
    @Schema(description = "매입 거래처(필수, 비면 건너뜀)")
    private String clientName;
    @Schema(description = "수량")
    private String qty;
    @Schema(description = "품목마다 발주일이 다를 때(수불대장). 비우면 요청의 발주일")
    private String orderDate;
    @Schema(description = "필요일")
    private String needDate;
}
