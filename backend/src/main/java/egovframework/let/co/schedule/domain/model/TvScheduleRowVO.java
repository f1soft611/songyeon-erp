package egovframework.let.co.schedule.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 현장 TV 화면 한 줄 VO 클래스 (송연 /api/tv/production · /api/tv/logistics).
 * 로그인 없이 열리는 화면이라 TV 에 보이는 칸(거래처·품목명·수량·비고)만 담는다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "현장 TV 한 줄")
@Getter
@Setter
public class TvScheduleRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "거래처")
    private String clientName;

    @Schema(description = "품목명(규격)")
    private String productName;

    @Schema(description = "수량(생산지시량 / 출고량)")
    private String orderQty;

    @Schema(description = "비고")
    private String note;

    public static TvScheduleRowVO of(String clientName, String productName, String orderQty, String note) {
        TvScheduleRowVO row = new TvScheduleRowVO();
        row.setClientName(clientName);
        row.setProductName(productName);
        row.setOrderQty(orderQty);
        row.setNote(note);
        return row;
    }
}
