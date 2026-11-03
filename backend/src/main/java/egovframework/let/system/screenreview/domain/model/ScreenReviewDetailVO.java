package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 패널 조회 결과 VO: 현황 + 이력 + 내 임시저장
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Schema(description = "화면검수 패널 조회 결과")
@Getter
@Setter
public class ScreenReviewDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "검수 현황. 없으면 null(미검수)")
    private ScreenReviewVO review;

    @Schema(description = "검수 이력(최근 것부터)")
    private List<ScreenReviewHistoryVO> history = new ArrayList<>();

    @Schema(description = "로그인 사용자의 임시저장. 없으면 null")
    private ScreenReviewDraftVO draft;
}
