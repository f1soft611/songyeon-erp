package egovframework.let.pd.confirm.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산관리 - 현장 투입지시서 VO 클래스(머리 + 원재료 줄)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "투입지시서")
@Getter
@Setter
public class BatchSheetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산건(품목·거래처·생산일자·생산지시량·로트번호·특이사항·치환 건수)")
    private ProductionScheduleVO header;

    @Schema(description = "원재료 줄(배합비율 높은 순)")
    private List<BatchSheetLineVO> rows;
}
