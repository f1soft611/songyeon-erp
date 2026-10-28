package egovframework.let.pu.stockadjust.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재고조정 창고이동 바코드 조회 결과(송연 /api/warehouse-moves/lookup) VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class WarehouseLookupVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialCode;
    private String materialName;
    private String barcode;
    private String lotDate;
    private Double unitWeight;
    private Integer boxQty;
    private String unit;
    private Double stockQty;
    private Double inMaterialWarehouse;
    private Double inWeighingWarehouse;
}
