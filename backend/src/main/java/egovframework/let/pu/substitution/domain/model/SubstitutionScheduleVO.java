package egovframework.let.pu.substitution.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재료 치환등록의 생산건 한 줄(목록 · 상세 머리) VO 클래스 (송연 /api/material-substitution · header)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "재료 치환등록 생산건")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SubstitutionScheduleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String scheduleDate;
    private String clientName;
    private String productName;
    private String orderQty;
    @Schema(description = "생산지시량을 숫자로 읽은 값(상세에서만)")
    private Double orderQtyNumber;
    private String lotNo;
    private String productCode;
    private String note;
    @Schema(description = "이 생산건에서 바꿔 쓰는 원재료 수")
    private Integer substitutionCount;
}
