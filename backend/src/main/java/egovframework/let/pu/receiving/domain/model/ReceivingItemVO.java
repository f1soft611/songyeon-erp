package egovframework.let.pu.receiving.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 입고(반품) 등록 요청의 품목 한 줄 VO 클래스. 숫자 칸은 화면이 적은 글자 그대로 받아 서버에서 읽는다(송연과 같음).
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "입고 등록 품목")
@Getter
@Setter
public class ReceivingItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialCode;
    @Schema(description = "거래처(필수, 비면 건너뜀)")
    private String clientName;
    private String qty;
    @Schema(description = "단가(입고는 필수, 반품은 원래 입고 단가를 따라온다)")
    private String unitPrice;
    @Schema(description = "발주에서 가져온 품목이면 그 발주 id")
    private Long poId;
    @Schema(description = "과세 · 면세 · 영세(그 밖은 과세)")
    private String taxType;
    private String returnReason;
    @Schema(description = "반품할 입고 id")
    private Long returnOfId;
    @Schema(description = "화면이 줄을 되찾으려고 붙인 표시(그대로 돌려준다)")
    private String key;
}
