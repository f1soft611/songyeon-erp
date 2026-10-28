package egovframework.let.sa.feasibility.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산가능확인 - 만들 것 한 줄 VO 클래스(제품명(규격), 생산수량 kg). 요청에서는 수량을 글자로 받는다('1,000' 도 읽는다).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "만들 것 한 줄")
@Getter
@Setter
public class FeasibilityLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품명(규격)")
    private String product;

    @Schema(description = "생산수량(kg, 요청)")
    private String qty;

    @Schema(description = "생산수량(kg, 읽은 값)")
    private Double qtyKg;
}
