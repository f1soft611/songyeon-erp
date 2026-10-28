package egovframework.let.pu.receiving.domain.model;

import java.io.Serializable;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import egovframework.let.common.attachment.domain.model.AttachmentVO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 입고(반품) 한 줄 VO 클래스 (송연 material_receiving).
 * 반품은 '마이너스 입고' 다 — 수량·금액을 음수로 같은 표에 넣어 입고현황·합계·재고가 저절로 맞게 한다.
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "입고 한 줄")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReceivingVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String materialCode;
    private String materialName;
    @Schema(description = "수량(반품은 음수)")
    private Double qty;
    @Schema(description = "입고일(반품일)")
    private String receiveDate;
    private String clientName;
    @Schema(description = "거래처코드(2026-10-26 저장하는 값)")
    private String clientCode;
    private Double unitPrice;
    private Double supplyAmount;
    private Double vatAmount;
    private Double totalAmount;
    @Schema(description = "과세 · 면세 · 영세")
    private String taxType;
    @Schema(description = "과세구분 공통코드 TAX_CATEGORY 코드(2026-10-26 저장하는 값)")
    private String taxCode;
    @Schema(description = "15자리 바코드(품목코드6_입고일자6+순번2). 반품은 없음")
    private String barcode;
    @Schema(description = "1 = 반품")
    private Integer isReturn;
    private String returnReason;
    @Schema(description = "어느 입고에서 나온 반품인가")
    private Long returnOfId;
    @Schema(description = "이 입고에서 이미 반품된 수량(반품 줄을 세어 쓴다)")
    private Double returnedQty;
    @Schema(description = "앞으로 더 반품할 수 있는 수량(반품 줄은 0)")
    private Double returnableQty;
    private Long poId;
    private String warehouse;
    @Schema(description = "창고코드(2026-10-26 저장하는 값)")
    private String warehouseCd;
    private String createdAt;
    @Schema(description = "붙어있는 서류")
    private transient List<AttachmentVO> files;
}
