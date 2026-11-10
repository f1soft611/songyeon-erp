package egovframework.let.qm.inspection.productinspection.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 제품검사 > 검사 탭 로트 한 줄 VO 클래스 (송연 /api/qdoc/lots 의 lot_context).
 * DB 에서 읽은 값(@JsonIgnore)으로 서비스가 생산량 · 출고일 · 소비기한을 만든다.
 * 성적서 표(송연 qdoc_record)가 ERP 에 아직 없어 recordId · recordStatus 는 늘 비어 있다(2026-11-06)
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
@Schema(description = "검사 탭 로트 한 줄 VO 클래스 (송연 /api/qdoc/lots)")
@Getter
@Setter
public class InspectionLotVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer lotId;
    private String lotNo;
    private String madeOn;
    private String productCode;
    private String productName;
    private String foodType;
    private String foodTypeNm;
    private String netWeight;

    // 응답: 서비스가 만든다
    private String shelfLife;
    private String qty;
    private Boolean qtyIsActual;
    private String shippedOn;
    private String shipState;
    private Integer recordId;
    private String recordStatus;

    // DB 에서 읽기만
    @JsonIgnore private Integer shelfLifeMonths;
    @JsonIgnore private String shelfLifeUnit;
    @JsonIgnore private String storage;
    @JsonIgnore private String actualQty;
    @JsonIgnore private String orderQty;
    @JsonIgnore private String logisticsDate;
    @JsonIgnore private Integer stockProduction;
    /** 확정된 출하줄 날짜(' / ' 로 이음) */
    @JsonIgnore private String doneShipDates;
    /** 확정 안 된 출하줄 날짜(' / ' 로 이음) */
    @JsonIgnore private String plannedShipDates;
}
