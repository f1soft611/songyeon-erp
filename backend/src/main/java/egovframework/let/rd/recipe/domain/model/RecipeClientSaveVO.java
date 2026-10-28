package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 업체 폴더 만들기·영업담당자 바꾸기 요청 VO 클래스 (담당자는 비워도 된다)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "업체 폴더 만들기·영업담당자 바꾸기 요청 VO 클래스 (담당자는 비워도 된다)")
@Getter
@Setter
public class RecipeClientSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String clientName;
    private String salesEmpId;
}
