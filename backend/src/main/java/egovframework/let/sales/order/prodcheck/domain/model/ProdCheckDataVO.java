package egovframework.let.sales.order.prodcheck.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산가능확인 - 계산용 DB 한 줄 VO 클래스(제품·배합비·원재료 재고·증감). 화면에 내보내지 않는다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "계산용 줄")
@Getter
@Setter
public class ProdCheckDataVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "코드")
    private String code;

    @Schema(description = "이름")
    private String name;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "원재료코드(배합비)")
    private String materialCode;

    @Schema(description = "원재료명(배합비)")
    private String materialName;

    @Schema(description = "배합비(0~1 비율)")
    private Double ratioPercent;

    @Schema(description = "지금 재고")
    private Double stockQty;

    @Schema(description = "증감 합계")
    private Double qty;

    /** 규격이 있으면 '이름(규격)', 없으면 이름 */
    public String display() {
        return spec != null && !spec.isEmpty() ? name + "(" + spec + ")" : name == null ? "" : name;
    }
}
