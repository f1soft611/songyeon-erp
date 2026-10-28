package egovframework.let.pu.receiving.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 입고(반품) 여러 건 등록 요청 VO 클래스 (송연 POST /api/materials/receiving/bulk)
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "입고·반품 등록 요청")
@Getter
@Setter
public class ReceivingBulkRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입고일(반품일)")
    private String receiveDate;
    @Schema(description = "반품이면 true")
    private Boolean isReturn;
    private List<ReceivingItemVO> items;
}
