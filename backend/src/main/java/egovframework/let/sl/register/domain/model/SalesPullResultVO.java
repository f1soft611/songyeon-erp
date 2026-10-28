package egovframework.let.sl.register.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 선택 항목 판매등록 결과 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "선택 항목 판매등록 결과")
@Getter
@Setter
public class SalesPullResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "판매로 넣은 건수")
    private int added;

    @Schema(description = "건너뛴 건수(이미 들어갔거나, 출하가 취소됐거나, 동시에 다른 사람이 넣은 것)")
    private int skipped;
}
