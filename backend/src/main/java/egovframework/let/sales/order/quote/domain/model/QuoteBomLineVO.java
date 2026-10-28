package egovframework.let.sales.order.quote.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 견적 배합비 한 줄 VO 클래스. 입력 원본 그대로 quotes.bom_json 에 남는다(배합비율은 퍼센트, 18.69).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "견적 배합비 한 줄")
@Getter
@Setter
public class QuoteBomLineVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "배합비율(%)")
    private Double ratioPercent;

    @Schema(description = "원재료단가(화면에서 넣은 값)")
    private Double unitPrice;

    @Schema(description = "원재료코드(목록에서 맞춘 원재료)")
    private String materialCode;
}
