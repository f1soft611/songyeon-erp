package egovframework.let.lg.confirm.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 출하 한 줄의 로트 배분 VO 클래스 (shipment_lot_allocation, 회수 때 되짚는 기록)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "로트 배분")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ShipLotAllocationVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @JsonIgnore
    private Long shipmentId;
    @JsonIgnore
    private Long lotId;
    private Double qty;
    private String lotNo;
    private String lotDate;
}
