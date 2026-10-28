package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 레시피 VO 클래스 (송연 recipe_drafts). 목록에서는 버전 수·최근 버전·분류도, 분류로 찾을 때는 그 버전 정보도
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "레시피 VO 클래스 (송연 recipe_drafts). 목록에서는 버전 수·최근 버전·분류도, 분류로 찾을 때는 그 버전 정보도")
@Getter
@Setter
public class RecipeDraftVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String clientName;
    private String name;
    private String spec;
    private String note;
    private String category;
    private String saleType;
    private String remark;
    private String updatedAt;
    private Integer versionCount;
    private Long latestVersionId;
    private Integer materialCount;
    private String stages;
    private String handoffKinds;
    private Long versionId;
    private String versionLabel;
    private String stage;
    private String versionUpdatedAt;
}
