package egovframework.let.sales.order.prodcheck.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산가능확인 - 원재료 한 줄 VO 클래스. per 는 합계 표에서만 제품마다의 필요량(lines 순서)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "원재료 한 줄")
@Getter
@Setter
public class ProdCheckRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료코드")
    private String code;

    @Schema(description = "원재료명")
    private String name;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "원재료 목록에 있는지")
    private Boolean known;

    @Schema(description = "필요량")
    private Double needQty;

    @Schema(description = "그 날짜 재고")
    private Double stockQty;

    @Schema(description = "생산 후 재고")
    private Double afterQty;

    @Schema(description = "부족량")
    private Double shortage;

    @Schema(description = "제품마다의 필요량(합계 표)")
    private List<Double> per;
}
