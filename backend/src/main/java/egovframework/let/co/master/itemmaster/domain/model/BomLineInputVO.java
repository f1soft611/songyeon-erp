package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 배합비 저장 요청 한 줄. ratioPercent 는 퍼센트(12.5 = 12.5%)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "배합비 저장 요청 한 줄. ratioPercent 는 퍼센트(12.5 = 12.5%)")
@Getter
@Setter
public class BomLineInputVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료명")
    private String materialName;

    @Schema(description = "배합비율 (%)")
    private Double ratioPercent;

    @Schema(description = "원재료단가 (원/kg). 비우면 원재료BOM 단가")
    private Double unitPrice;

    @Schema(description = "원재료 코드 (자동완성으로 고른 경우)")
    private String materialCode;
}
