package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 제품 목록 한 줄 (송연 products + 원재료 수·마지막생산일)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "제품 목록 한 줄 (송연 products + 원재료 수·마지막생산일)")
@Getter
@Setter
public class ProductBomVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드")
    private String code;

    @Schema(description = "품목명")
    private String name;

    @Schema(description = "규격/단위")
    private String spec;

    @Schema(description = "보관방법 코드(공통코드 STORAGE_METHOD, 2026-10-23)")
    private String storage;

    @Schema(description = "보관방법 이름(공통코드 STORAGE_METHOD)")
    private String storageNm;

    @Schema(description = "거래처코드(clients.client_code, 2026-10-23. 제품에는 이 코드를 저장한다)")
    private String clientCode;

    @Schema(description = "업체명(거래처BOM 이름)")
    private String clientName;

    @Schema(description = "사용안함 (1 = 고르는 목록에서 뺌)")
    private Integer discontinued;

    @Schema(description = "사용안함으로 바꾼 일시")
    private String discontinuedAt;

    @Schema(description = "사용안함으로 바꾼 사람")
    private String discontinuedBy;

    @Schema(description = "사용안함 메모")
    private String discontinuedNote;

    @Schema(description = "현재고")
    private Double stockQty;

    @Schema(description = "원재료 수")
    private Long materialCount;

    @Schema(description = "마지막 생산일 (실생산량이 적힌 생산스케줄 기준)")
    private String lastProducedDate;

    @Schema(description = "등록자 사번(2026-10-23)")
    private String regUserId;

    @Schema(description = "등록자 이름")
    private String regUserNm;

    @Schema(description = "등록일시(YYYY-MM-DD HH24:MI:SS)")
    private String regDt;

    @Schema(description = "수정자 사번(2026-10-23)")
    private String updUserId;

    @Schema(description = "수정자 이름")
    private String updUserNm;

    @Schema(description = "수정일시(YYYY-MM-DD HH24:MI:SS)")
    private String updDt;
}
