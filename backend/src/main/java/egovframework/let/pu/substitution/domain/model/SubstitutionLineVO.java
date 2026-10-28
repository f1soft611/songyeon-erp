package egovframework.let.pu.substitution.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재료 치환등록 상세의 원재료 한 줄 VO 클래스 (송연 _production_material_lines)
 * 바꿔 쓰기가 있으면 materialCode/Name 은 바꿀 것, originCode/Name 은 배합표의 원래 원재료(지금 이름).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "재료 치환등록 원재료 줄")
@Getter
@Setter
public class SubstitutionLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialCode;
    private String materialName;
    private String originCode;
    private String originName;
    @Schema(description = "배합비(%) — bom.ratio_percent(0~1) × 100, 소수 넷째 자리")
    private Double ratioPercent;
    @Schema(description = "투입량(kg) — 생산지시량 × 배합비율, 소수 셋째 자리")
    private Double qty;
    private boolean substituted;
    private Long subId;
    private String reason;
}
