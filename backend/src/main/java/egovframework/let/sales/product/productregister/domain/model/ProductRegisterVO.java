package egovframework.let.sales.product.productregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 제품등록 저장 값 VO 클래스 (송연 products · pricing 한 줄).
 * 제품코드는 저장 직전 발번해 productCode 에 채워진다. 저장 결과(제품코드·원재료비)로도 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "등록한 제품")
@Getter
@Setter
public class ProductRegisterVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드(발번)")
    private String productCode;

    @Schema(description = "제품명")
    private String productName;

    @Schema(description = "등록자 사번(2026-10-23)")
    private String regUserId;

    @Schema(description = "규격/단위")
    private String spec;

    @Schema(description = "보관방법")
    private String storage;

    // 거래처코드(2026-10-23): 제품 표에는 이 코드를 저장한다(이름은 응답용)
    private String clientCode;

    @Schema(description = "포장유형")
    private String productType;

    @Schema(description = "원재료비(배합비 적용단가 합)")
    private Double materialCost;

    @Schema(description = "단가표 고정마진율(%)")
    private Double markupRate;

    @Schema(description = "단가표 고정마진")
    private Double markupCost;

    @Schema(description = "단가표 로스율(%)")
    private Double lossRate;

    @Schema(description = "단가표 로스")
    private Double lossCost;

    @Schema(description = "단가표 인건비")
    private Double laborCost;

    @Schema(description = "단가표 포장비")
    private Double packagingCost;

    @Schema(description = "단가표 물류비")
    private Double logisticsCost;

    @Schema(description = "단가표 마진")
    private Double margin;

    @Schema(description = "단가표 기타단가1")
    private Double otherCost1;

    @Schema(description = "단가표 기타단가1 비고")
    private String otherCost1Note;

    @Schema(description = "단가표 기타단가2")
    private Double otherCost2;

    @Schema(description = "단가표 기타단가2 비고")
    private String otherCost2Note;

    @Schema(description = "단가표 기타단가3")
    private Double otherCost3;

    @Schema(description = "단가표 기타단가3 비고")
    private String otherCost3Note;

    @Schema(description = "단가표 기타단가4")
    private Double otherCost4;

    @Schema(description = "단가표 기타단가4 비고")
    private String otherCost4Note;

    @Schema(description = "단가표 현재 판매단가(견적 확정단가)")
    private Double currentPrice;

    @Schema(description = "단가표 제품단가(원가 합계)")
    private Double totalPrice;
}
