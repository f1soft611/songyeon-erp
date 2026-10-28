package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 창고등록 VO 클래스 (tb_warehouse)
 * 원재료(materials.warehouse) 등은 창고를 번호가 아니라 이름(warehouse_nm)으로 가리킨다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_warehouse 로 변경)
 */
@Schema(description = "창고(기초정보) 모델")
@Getter
@Setter
public class WarehouseVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고 ID")
    private Long warehouseId;

    @Schema(description = "창고코드 (서버가 WH001 … 로 매김)")
    private String warehouseCd;

    @Schema(description = "창고명")
    private String warehouseNm;

    @Schema(description = "창고유형 (원자재/부자재/재공/완제품/반품/보류/폐기/외부)")
    private String warehouseType;

    @Schema(description = "기본창고 여부 (Y/N, 전체에서 한 곳 = 입고창고)")
    private String defaultYn;

    @Schema(description = "설명")
    private String remark;

    @Schema(description = "정렬순서")
    private Integer sortSeq;

    @Schema(description = "사용여부(상태) Y 사용중 / N 사용안함(삭제한 줄)")
    private String useYn;

    @Schema(description = "두고 있는 원재료 수 (조회 전용)")
    private Long materialCount;

    @Schema(description = "등록자 사번")
    private String regUserId;

    @Schema(description = "등록자 이름")
    private String regUserNm;

    @Schema(description = "등록일시 (yyyy-MM-dd HH:mm:ss)")
    private String regDt;

    @Schema(description = "수정자 사번")
    private String updUserId;

    @Schema(description = "수정자 이름")
    private String updUserNm;

    @Schema(description = "수정일시 (yyyy-MM-dd HH:mm:ss)")
    private String updDt;
}
