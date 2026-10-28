package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 배합비 역전개 VO 클래스 (이 원재료를 쓰는 제품)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "배합비 역전개 모델")
@Getter
@Setter
public class MaterialUsageVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "품목명")
    private String productName;

    @Schema(description = "규격")
    private String productSpec;

    @Schema(description = "배합비율(0~1)")
    private Double ratioPercent;
}
