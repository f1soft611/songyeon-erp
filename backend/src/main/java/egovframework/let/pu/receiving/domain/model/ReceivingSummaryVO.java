package egovframework.let.pu.receiving.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 서류등록 탭의 품목별 입고 집계 · 상세 한 줄 VO 클래스 (송연 receiving-status · detail)
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "품목별 입고 집계")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReceivingSummaryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialCode;
    private String materialName;
    @Schema(description = "기간 안 입고 수량 합(반품 포함)")
    private Double totalQty;
    @Schema(description = "기간 안 입고 건수(반품 포함)")
    private Integer entryCount;

    // 상세 한 줄
    private String date;
    private Double qty;
    private String clientName;
}
