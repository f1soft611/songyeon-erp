package egovframework.let.sl.register.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 판매로 끌어올 출하확정 한 줄 VO 클래스 (송연 sales.py _shippable_rows).
 * 어느 출하 건인지(sourceType·sourceId)를 함께 준다 — 같은 건을 두 번 끌어오지 않으려면 화면이 그 번호를 알아야 한다.
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "판매로 끌어올 출하확정 건")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ShippableSaleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "logistics(출하등록 줄) | production(물류출고일이 적힌 생산확정 줄)")
    private String sourceType;
    private Long sourceId;
    @Schema(description = "출고일 = 판매일자")
    private String saleDate;
    private String clientName;
    @Schema(description = "품목명(규격)")
    private String productName;
    @Schema(description = "거래처코드 · 제품코드(2026-10-26 판매로 끌어올 때 그대로 저장)")
    private String clientCode;
    private String productCode;
    @Schema(description = "수량(실출하량, 없으면 예정량을 숫자로 읽은 것)")
    private Double qty;
    @Schema(description = "판매단가(단가관리 현재단가, 없으면 계산단가). 없으면 비어 있다")
    private Double unitPrice;
    @Schema(description = "금액 = 수량 × 단가. 단가가 없으면 비어 있다")
    private Double amount;
    @Schema(description = "이미 판매로 들어간 건인가")
    private Boolean already;

    // SQL 에서 읽기만 하는 값
    @JsonIgnore
    private String qtyText;
}
