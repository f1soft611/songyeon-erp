package egovframework.let.co.master.warehouse.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 창고 등록/수정 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_warehouse 로 변경)
 */
@Schema(description = "창고(기초정보) 저장 요청 모델")
@Getter
@Setter
public class WarehouseSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고코드(쓰지 않음). 새로 등록하면 서버가 6자리 숫자(000001 …)로 매긴다(2026-10-22)")
    private String warehouseCd;

    @Schema(description = "창고명")
    private String warehouseNm;

    @Schema(description = "창고유형 (원자재/부자재/재공/완제품/반품/보류/폐기/외부)")
    private String warehouseType;

    @Schema(description = "기본창고 여부. 켜면 다른 기본창고를 끈다(전체에서 한 곳 = 입고창고). 수정할 때 null 이면 그대로 둔다")
    private Boolean defaultYn;

    @Schema(description = "설명")
    private String remark;

    @Schema(description = "상태(사용여부) 'Y' 사용 · 'N' 사용안함. 비우면 'Y'(2026-10-22 상태 체크박스)")
    private String useYn;
}
