package egovframework.let.lg.confirm.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 물류관리 - 출하확정 요청 VO 클래스. 숫자 칸도 화면이 적은 글자 그대로 받아 서버에서 읽는다(송연과 같음).
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "출하확정 요청")
@Getter
@Setter
public class ShipConfirmRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "실출하량(필수, 이 수량만큼 재고가 빠진다)", example = "135kg")
    private String actualQty;
    @Schema(description = "박스수량")
    private String boxQty;
    @Schema(description = "배차")
    private String vehicle;
    @Schema(description = "운행자")
    private String driverName;
    @Schema(description = "포장방법")
    private String packingMethod;
    @Schema(description = "특이사항")
    private String note;
    @Schema(description = "순서")
    private String visitOrder;
    @Schema(description = "용차정보")
    private String charterInfo;
    @Schema(description = "용차금액")
    private String charterAmount;
}
