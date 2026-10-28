package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 공유 한 줄 VO 클래스 (송연 recipe_shares + 레시피명·사원·버전)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "상품개발 - 레시피 공유 한 줄 VO 클래스")
@Getter
@Setter
public class RecipeShareVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long draftId;
    private String draftName;
    private String employeeId;
    private String employeeName;
    private String employeeDepartment;
    private String expiresAt;
    private Integer revoked;
    private String createdAt;
    private Long versionId;
    private String versionLabel;
    private boolean expired;
}
