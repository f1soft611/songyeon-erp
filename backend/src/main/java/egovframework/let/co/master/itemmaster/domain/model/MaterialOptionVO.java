package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 원재료 고르기 목록 한 줄 (자동완성·단가 채우기·부자재 분류)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 고르기 목록 한 줄 (자동완성·단가 채우기·부자재 분류)")
@Getter
@Setter
public class MaterialOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료 코드")
    private String code;

    @Schema(description = "원재료명")
    private String name;

    @Schema(description = "원재료단가 (원/kg)")
    private Double unitPrice;

    @Schema(description = "부자재 분류 (필름·파우치·박스)")
    private String subCategory;
    @Schema(description = "부자재 분류 이름(공통코드 SUB_MATERIAL_CATEGORY, 예: 필름). 2026-10-23 부터 subCategory 는 코드")
    private String subCategoryNm;
}
