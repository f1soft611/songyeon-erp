package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 부자재 저장 요청
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "부자재 저장 요청")
@Getter
@Setter
public class SubMaterialsSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "한 봉 내용량 (kg)")
    private Double pouchNetWeightKg;

    @Schema(description = "한 봉당 필름길이 (M)")
    private Double pouchLengthM;

    @Schema(description = "한 봉당 파우치 수")
    private Double pouchPerUnit;

    @Schema(description = "필름 (원재료명 또는 코드)")
    private String filmMaterial;

    @Schema(description = "파우치 (원재료명 또는 코드)")
    private String pouchMaterial;

    @Schema(description = "박스 (원재료명 또는 코드)")
    private String boxMaterial;
}
