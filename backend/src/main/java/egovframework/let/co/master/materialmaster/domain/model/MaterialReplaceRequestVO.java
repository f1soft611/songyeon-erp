package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 일괄적용 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 일괄적용 요청")
@Getter
@Setter
public class MaterialReplaceRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "대체할 원재료코드")
    private String newMaterialCode;

    @Schema(description = "바꿀 제품코드(비우면 이 원재료를 쓰는 모든 제품)")
    private java.util.List<String> productCodes;
}
