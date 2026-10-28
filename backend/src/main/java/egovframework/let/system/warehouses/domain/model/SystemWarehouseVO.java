package egovframework.let.system.warehouses.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 창고 정보 응답을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
@Schema(description = "창고 정보 모델")
@Getter
@Setter
public class SystemWarehouseVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "창고 ID")
    private Long warehouseId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "창고명")
    private String warehouseNm;

    @Schema(description = "사용 여부")
    private String useAt;

    @Schema(description = "등록자 ID")
    private Long createdBy;

    @Schema(description = "등록일시")
    private Date createdAt;

    @Schema(description = "수정자 ID")
    private Long updatedBy;

    @Schema(description = "수정일시")
    private Date updatedAt;
}
