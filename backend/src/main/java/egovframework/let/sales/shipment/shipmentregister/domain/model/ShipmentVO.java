package egovframework.let.sales.shipment.shipmentregister.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 출하등록 한 줄 VO 클래스.
 * 목록(source = manual: 출하등록에서 넣은 줄 | production: 물류출고일이 있는 생산확정 줄)과 등록 요청에 같이 쓴다.
 * 목록의 orderQty 는 실출하량이 있으면 실출하량, 없으면 예정량이다(송연 COALESCE).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "출하 항목")
@Getter
@Setter
public class ShipmentVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "출하 ID(생산연동 줄은 생산확정 ID)")
    private Long id;

    @Schema(description = "manual | production")
    private String source;

    @Schema(description = "출고일")
    private String scheduleDate;

    @Schema(description = "거래처명")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-26 logistics_schedule 에 저장하는 값)")
    private String clientCode;

    @Schema(description = "품목명(이름(규격))")
    private String productName;

    @Schema(description = "제품코드")
    private String productCode;

    @Schema(description = "규격(제품코드 찾기용, 저장하지 않음)")
    private String spec;

    @Schema(description = "출하량")
    private String orderQty;

    @Schema(description = "예정량")
    private String plannedQty;

    @Schema(description = "실출하량")
    private String actualQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "로트(생산확정) ID")
    private Long lotId;

    @Schema(description = "가져온 수주 ID")
    private Long sourceOrderId;

    @Schema(description = "로트번호")
    private String lotNo;

    @Schema(description = "로트 생산일")
    private String lotDate;

    @Schema(description = "출하확정(1/0)")
    private Integer shipConfirmed;

    @Schema(description = "같은 출고일 안의 순서")
    private Integer sortOrder;

    @Schema(description = "등록 시각")
    private String createdAt;

    @Schema(description = "로트 배분")
    private List<LotAllocationVO> lotAllocations;

    /** 출하확정된 줄인지 */
    public boolean confirmed() {
        return shipConfirmed != null && shipConfirmed != 0;
    }
}
