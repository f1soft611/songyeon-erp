package egovframework.let.pu.receiving.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 서류등록 탭 상세보기 VO 클래스 ({rows, totalReceived, totalUsed})
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "입고 상세")
@Getter
@Setter
public class ReceivingDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<ReceivingSummaryVO> rows;
    @Schema(description = "이 기간 총 입고량")
    private Double totalReceived;
    @Schema(description = "이 기간 총 생산사용량")
    private Double totalUsed;
}
