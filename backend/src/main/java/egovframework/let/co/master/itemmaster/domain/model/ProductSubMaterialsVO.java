package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 제품에 물려둔 부자재 (필름·파우치·박스)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "제품에 물려둔 부자재 (필름·파우치·박스)")
@Getter
@Setter
public class ProductSubMaterialsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "한 봉 내용량 (kg)")
    private Double pouchNetWeightKg;

    @Schema(description = "한 봉당 필름길이 (M)")
    private Double pouchLengthM;

    @Schema(description = "한 봉당 파우치 수")
    private Double pouchPerUnit;

    @Schema(description = "필름 원재료 코드")
    private String filmMaterialCode;

    @Schema(description = "파우치 원재료 코드")
    private String pouchMaterialCode;

    @Schema(description = "박스 원재료 코드")
    private String boxMaterialCode;

    @Schema(description = "필름 원재료명")
    private String filmMaterialName;

    @Schema(description = "파우치 원재료명")
    private String pouchMaterialName;

    @Schema(description = "박스 원재료명")
    private String boxMaterialName;
}
