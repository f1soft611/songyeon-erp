package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 넘기기 요청 VO 클래스 ({versionId, kind: 확정·견적·기타})
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "상품개발 - 레시피 넘기기 요청 VO 클래스")
@Getter
@Setter
public class RecipeHandoffSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Object versionId;
    private String kind;
}
