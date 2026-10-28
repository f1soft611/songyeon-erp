package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 업체 폴더 VO 클래스 (송연 recipe_clients + 레시피에 적힌 업체명)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "업체 폴더 VO 클래스 (송연 recipe_clients + 레시피에 적힌 업체명)")
@Getter
@Setter
public class RecipeClientVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String clientName;
    private String salesEmpId;
    private String salesEmpName;
    private String salesEmpDepartment;
    private Integer recipeCount;
}
