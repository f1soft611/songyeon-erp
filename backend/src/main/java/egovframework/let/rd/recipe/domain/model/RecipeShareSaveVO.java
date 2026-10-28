package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 공유 등록 요청 VO 클래스 ({draftId, versionId, employeeId, expiresAt})
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "상품개발 - 레시피 공유 등록 요청 VO 클래스")
@Getter
@Setter
public class RecipeShareSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Object draftId;
    private Object versionId;
    private String employeeId;
    private String expiresAt;
}
