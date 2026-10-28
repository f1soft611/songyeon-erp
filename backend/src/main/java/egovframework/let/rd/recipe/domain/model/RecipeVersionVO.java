package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 레시피 버전 VO 클래스 (송연 recipe_versions). stage 가 있으면 공유되어 잠긴 버전
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "레시피 버전 VO 클래스 (송연 recipe_versions). stage 가 있으면 공유되어 잠긴 버전")
@Getter
@Setter
public class RecipeVersionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long draftId;
    private String versionLabel;
    private String note;
    private String stage;
    private String createdAt;
    private String handoffKinds;
}
