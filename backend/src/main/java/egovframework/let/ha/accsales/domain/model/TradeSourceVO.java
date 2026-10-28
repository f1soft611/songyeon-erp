package egovframework.let.ha.accsales.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 매출·매입관리 원본 한 줄 VO 클래스
 * 출하(logistics_schedule · production_schedule) · 이월(delivery_carryover) · 입고(material_receiving) · 판매단가(products + pricing)를 읽을 때 같이 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.15
 * @version 1.0
 */
@Schema(description = "인사·회계 - 매출·매입관리 원본 한 줄 VO 클래스")
@Getter
@Setter
public class TradeSourceVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String date;
    private String clientName;
    private String itemName;
    /** 출하 수량은 글자로 적혀 있다('1,000kg'). 송연 parse_qty_number 로 읽는다 */
    private String qtyText;
    private Double qty;
    private Double unitPrice;
    private Double supplyAmount;
    private Double vatAmount;
    private Double amount;
    /** 이월: logistics · production 과 원본 id */
    private String scheduleType;
    private Long scheduleId;
    /** 판매단가 표 · 제품 고를 거리: 제품 이름 · 규격 */
    private String name;
    private String spec;
}
