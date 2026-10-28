package egovframework.let.system.warehouses.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 창고 등록/수정 요청을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
@Schema(description = "창고 저장 요청 모델")
@Getter
@Setter
public class SystemWarehouseSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고명")
    private String warehouseNm;

    @Schema(description = "사용 여부")
    private String useAt;
}
