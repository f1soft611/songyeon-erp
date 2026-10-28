package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 기본정보 저장 결과 VO 클래스
 * 이름을 바꿨으면 배합표·레시피가 어디까지 따라 바뀌었는지 알려준다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 기본정보 저장 결과")
@Getter
@Setter
public class MaterialInfoSaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "바꾸기 전 이름(이름을 바꾼 경우만)")
    private String renamedFrom;

    @Schema(description = "같이 바뀐 제품BOM 줄 수")
    private Integer cascadedBom;

    @Schema(description = "같이 바뀐 레시피 줄 수")
    private Integer cascadedRecipeVersion;

    @Schema(description = "이름이 겹쳐 레시피를 손대지 않은 경우, 같은 이름 원재료 수")
    private Integer cascadedRecipeSkipped;
}
