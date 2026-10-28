package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 레시피 저장 요청 VO 클래스 (새 레시피는 bom 까지, 고칠 때는 머리 정보만)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "레시피 저장 요청 VO 클래스 (새 레시피는 bom 까지, 고칠 때는 머리 정보만)")
@Getter
@Setter
public class RecipeSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String clientName;
    private String name;
    private String spec;
    private String note;
    private String category;
    private String saleType;
    private String remark;
    private List<RecipeBomInputVO> bom;
}
