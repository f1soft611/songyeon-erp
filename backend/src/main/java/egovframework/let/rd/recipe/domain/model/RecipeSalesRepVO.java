package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 영업담당자로 고를 사원 VO 클래스 (이름·부서만)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "영업담당자로 고를 사원 VO 클래스 (이름·부서만)")
@Getter
@Setter
public class RecipeSalesRepVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String name;
    private String department;
}
