package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 공유로그 한 줄 VO 클래스 (송연 recipe_stage_logs)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "공유로그 한 줄 VO 클래스 (송연 recipe_stage_logs)")
@Getter
@Setter
public class RecipeStageLogVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String versionLabel;
    private String stage;
    private String employeeName;
    private String createdAt;
}
