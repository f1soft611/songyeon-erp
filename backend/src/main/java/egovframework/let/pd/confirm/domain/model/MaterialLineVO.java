package egovframework.let.pd.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 생산확정 원재료 계산용 VO 클래스(배합비 줄·치환 쪽지·사용 기록). 화면에 내보내지 않는다.
 * bom.ratio_percent 는 이름과 달리 0~1 비율이다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "원재료 계산용 줄")
@Getter
@Setter
public class MaterialLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산확정 ID")
    private Long scheduleId;

    @Schema(description = "원재료코드")
    private String materialCode;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "배합비(0~1)")
    private Double ratioPercent;

    @Schema(description = "사용량(kg)")
    private Double qtyUsed;

    @Schema(description = "치환 전 원재료코드")
    private String fromMaterialCode;

    @Schema(description = "치환 전 원재료명")
    private String fromMaterialName;

    @Schema(description = "치환 후 원재료코드")
    private String toMaterialCode;

    @Schema(description = "치환 후 원재료명")
    private String toMaterialName;

    @Schema(description = "치환 사유")
    private String reason;

    @Schema(description = "기록 시각")
    private String createdAt;
}
