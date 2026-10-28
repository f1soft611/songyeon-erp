package egovframework.let.sa.product.domain.model;

import java.io.Serializable;
import java.util.List;

import egovframework.let.co.master.itemmaster.domain.model.BomLineInputVO;
import egovframework.let.sa.quote.domain.model.QuoteCostsVO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 제품등록 요청 VO 클래스 (송연 SA0001 제품 등록 본문에서 제품코드를 뺀 것 — 제품코드는 저장할 때 발번)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "제품 등록 요청")
@Getter
@Setter
public class ProductRegisterRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품명(필수)")
    private String productName;

    // 등록자 사번(2026-10-23): 화면에서 받지 않고 서버가 로그인 사원으로 채운다
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String regUserId;

    @Schema(description = "규격/단위")
    private String spec;

    @Schema(description = "포장유형(기초정보 포장유형 이름)")
    private String productType;

    @Schema(description = "보관방법")
    private String storage;

    @Schema(description = "거래처명(거래처BOM 에 있는 이름). 2026-10-23 부터 저장에는 쓰지 않는다(clientCode 를 쓴다)")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-23, 화면이 목록에서 고른 값). 비우면 거래처 없음")
    private String clientCode;

    @Schema(description = "원재료 배합비(배합비율은 퍼센트, 이름·비율이 있는 줄만)")
    private List<BomLineInputVO> bom;

    @Schema(description = "견적에서 확정으로 넘어온 경우 그 견적 번호(등록하면 견적이 확정된다)")
    private Long quoteId;

    @Schema(description = "견적의 원가 항목(견적 확정일 때 단가관리에 그대로 반영)")
    private QuoteCostsVO quoteCosts;
}
