package egovframework.let.sales.order.quote.domain.model;

import java.io.Serializable;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 견적 VO 클래스 (송연 quotes 한 줄). 목록·상세·저장 값에 같이 쓴다.
 * 상세에는 저장해 둔 입력 원본 배합비(bom)가 붙는다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "견적")
@Getter
@Setter
public class QuoteVO extends QuoteCostsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "견적 ID")
    private Long quoteId;

    @Schema(description = "제품명")
    private String productName;

    @Schema(description = "규격/단위")
    private String spec;

    @Schema(description = "포장유형")
    private String productType;

    @Schema(description = "보관방법 코드(공통코드 STORAGE_METHOD, 2026-10-23)")
    private String storage;

    @Schema(description = "보관방법 이름")
    private String storageNm;

    @Schema(description = "거래처명(거래처마스터에서 붙인 이름)")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-23, 견적에는 이 코드를 저장한다)")
    private String clientCode;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "원재료비")
    private Double materialCost;

    @Schema(description = "고정마진")
    private Double markupCost;

    @Schema(description = "로스")
    private Double lossCost;

    @Schema(description = "견적단가(확정단가가 있으면 그 값)")
    private Double totalPrice;

    @Schema(description = "draft | confirmed")
    private String status;

    @Schema(description = "확정으로 만든 제품코드")
    private String confirmedProductCode;

    @Schema(description = "작성 시각")
    private String createdAt;

    @Schema(description = "레시피에서 넘어온 견적 구분")
    private String sourceKind;

    @Schema(description = "레시피 이름")
    private String sourceRecipe;

    @Schema(description = "저장해 둔 배합비(상세)")
    private List<QuoteBomLineVO> bom;

    /** quotes.bom_json 원문(화면에는 bom 으로 풀어서 준다) */
    @JsonIgnore
    private String bomJson;
}
