package egovframework.let.sales.order.orderregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 수주등록 품목 후보 VO 클래스 (송연 /api/products/order-candidates)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "수주 품목 후보")
@Getter
@Setter
public class OrderProductVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드")
    private String code;

    @Schema(description = "제품명")
    private String name;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "거래처명")
    private String clientName;

    /** 규격이 있으면 '이름(규격)', 없으면 이름 */
    @Schema(description = "화면 표시(이름(규격))")
    public String getDisplay() {
        return spec == null || spec.isEmpty() ? name : name + "(" + spec + ")";
    }
}
