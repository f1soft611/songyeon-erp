package egovframework.let.sa.feasibility.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산가능확인 - 제품 하나만 만들 때 VO 클래스(다른 제품이 쓸 몫을 빼지 않은 재고로 본다)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "제품별 판정")
@Getter
@Setter
public class FeasibilityByProductVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품명(규격)")
    private String product;

    @Schema(description = "생산수량")
    private Double qty;

    @Schema(description = "원재료")
    private List<FeasibilityRowVO> rows;

    @Schema(description = "모자란 원재료 수")
    private Integer shortageCount;

    @Schema(description = "이것만이면 넉넉")
    private Boolean ok;
}
