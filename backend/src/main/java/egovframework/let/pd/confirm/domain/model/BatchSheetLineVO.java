package egovframework.let.pd.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 투입지시서 원재료 한 줄 VO 클래스(생산지시량으로 환산한 kg). 바꿔 쓰는 원재료는 바뀐 이름으로 나온다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "투입지시서 한 줄")
@Getter
@Setter
public class BatchSheetLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료코드")
    private String materialCode;

    @Schema(description = "원재료명(바꿔 쓰면 바뀐 이름)")
    private String materialName;

    @Schema(description = "원래 원재료명")
    private String originName;

    @Schema(description = "투입량(kg) = 생산지시량 × 배합비율")
    private Double qty;

    @Schema(description = "바꿔 쓰는 원재료인지")
    private Boolean substituted;

    @Schema(description = "바꿔 쓰는 사유")
    private String reason;
}
