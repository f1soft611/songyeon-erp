package egovframework.let.sales.order.orderregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 수주등록 VO 클래스 (송연 sales_order 한 줄).
 * 조회 결과와 저장 요청에 같이 쓴다. 저장 요청의 spec 은 제품코드 찾기에만 쓰고 저장하지 않는다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "수주 항목")
@Getter
@Setter
public class SalesOrderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "수주 ID")
    private Long id;

    @Schema(description = "수주일(YYYY-MM-DD)")
    private String orderDate;

    @Schema(description = "거래처명(거래처BOM 철자)")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-26 sales_order 에 저장하는 값)")
    private String clientCode;

    @Schema(description = "품목명(이름(규격))")
    private String productName;

    @Schema(description = "제품코드(하나로 정해지지 않으면 비움)")
    private String productCode;

    @Schema(description = "규격(제품코드 찾기용, 저장하지 않음)")
    private String spec;

    @Schema(description = "수량(글자 그대로 저장)")
    private String orderQty;

    @Schema(description = "비고")
    private String note;

    @Schema(description = "생산예정일")
    private String productionDate;

    @Schema(description = "물류출고일(재고생산이면 비움)")
    private String logisticsDate;

    @Schema(description = "재고생산(1/0)")
    private Integer isStockProduction;

    @Schema(description = "가져감(옛 표시)")
    private Integer imported;

    @Schema(description = "생산확정에서 가져감(1/0)")
    private Integer importedProduction;

    @Schema(description = "출하등록에서 가져감(1/0)")
    private Integer importedShipment;

    @Schema(description = "같은 수주일 안의 순서")
    private Integer sortOrder;

    @Schema(description = "등록 시각")
    private String createdAt;
}
