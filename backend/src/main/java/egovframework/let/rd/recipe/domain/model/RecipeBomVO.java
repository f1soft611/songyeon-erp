package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 레시피 배합표 한 줄 VO 클래스 (송연 recipe_version_bom). ratioPercent 는 0~1 비율
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "레시피 배합표 한 줄 VO 클래스 (송연 recipe_version_bom). ratioPercent 는 0~1 비율")
@Getter
@Setter
public class RecipeBomVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialCode;
    private String materialName;
    private Double weight;
    private Double ratioPercent;
    private Double unitPricePerKg;
    private Double amountPerKg;
}
