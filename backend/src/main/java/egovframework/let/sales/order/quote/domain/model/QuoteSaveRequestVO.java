package egovframework.let.sales.order.quote.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 가견적 작성·수정 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "가견적 저장")
@Getter
@Setter
public class QuoteSaveRequestVO extends QuoteCostsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품명")
    private String productName;

    @Schema(description = "규격/단위")
    private String spec;

    @Schema(description = "포장유형")
    private String productType;

    @Schema(description = "보관방법")
    private String storage;

    @Schema(description = "거래처명(2026-10-23 부터 저장에는 쓰지 않는다)")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-23, 화면이 목록에서 고른 값)")
    private String clientCode;

    @Schema(description = "비고(견적서 비고란)")
    private String note;

    @Schema(description = "배합비")
    private List<QuoteBomLineVO> bom;
}
