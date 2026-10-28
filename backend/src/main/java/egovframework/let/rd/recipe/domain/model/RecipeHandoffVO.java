package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 공유 로그 한 줄 VO 클래스 (송연 recipe_handoffs + 레시피·견적·표시사항 요청 상태)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "상품개발 - 레시피 공유 로그 한 줄 VO 클래스")
@Getter
@Setter
public class RecipeHandoffVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long draftId;
    private Long versionId;
    private String versionLabel;
    private String kind;
    private Long quoteId;
    private String requestedByName;
    private String requestedByUsername;
    private String createdAt;
    private String draftName;
    private String clientName;
    private Long labelRequestId;
    private String labelStatus;
    private String quoteStatus;
}
