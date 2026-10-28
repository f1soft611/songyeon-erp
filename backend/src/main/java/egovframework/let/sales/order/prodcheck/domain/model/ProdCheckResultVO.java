package egovframework.let.sales.order.prodcheck.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산가능확인 - 확인 결과 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "생산가능확인 결과")
@Getter
@Setter
public class ProdCheckResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산일자")
    private String date;

    @Schema(description = "만들 것")
    private List<ProdCheckLineVO> lines;

    @Schema(description = "원재료(합계)")
    private List<ProdCheckRowVO> rows;

    @Schema(description = "제품별")
    private List<ProdCheckByProductVO> byProduct;

    @Schema(description = "BOM 을 못 찾은 제품")
    private List<String> unknownProducts;

    @Schema(description = "모자란 원재료 수")
    private Integer shortageCount;

    @Schema(description = "모두 넉넉")
    private Boolean ok;
}
