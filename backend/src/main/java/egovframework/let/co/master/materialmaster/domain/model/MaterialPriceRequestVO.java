package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 단가 저장 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 단가 저장 요청")
@Getter
@Setter
public class MaterialPriceRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "단가(원, 숫자 글자)")
    private String unitPrice;

    @Schema(description = "적용일자(비우면 바로, 앞날이면 예약)")
    private String effectiveDate;
}
