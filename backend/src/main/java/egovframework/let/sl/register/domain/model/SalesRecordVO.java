package egovframework.let.sl.register.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 판매 한 건 VO 클래스 (송연 sales_record). 금액은 적어둘 때 값으로 굳는다 — 단가를 고쳐도 지난 판매 금액은 그대로다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "판매 한 건")
@Getter
@Setter
public class SalesRecordVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    @Schema(description = "판매일자(YYYY-MM-DD)")
    private String saleDate;
    private String clientName;
    @Schema(description = "품목명(규격)")
    private String productName;
    @Schema(description = "거래처코드 · 제품코드(2026-10-26 sales_record 에 저장하는 값)")
    private String clientCode;
    private String productCode;
    @Schema(description = "수량. 직접 등록에서는 '100' 처럼 글자로 받아 숫자로 읽는다")
    private String qtyText;
    private Double qty;
    @Schema(description = "단가. 직접 등록에서 비우면 단가관리의 판매단가를 쓴다")
    private String unitPriceText;
    private Double unitPrice;
    private Double amount;
    private String note;
    @Schema(description = "manual(직접등록) | logistics | production(출하확정에서 끌어옴)")
    private String sourceType;
    private Long sourceId;
    private String createdAt;
    private String createdBy;
}
