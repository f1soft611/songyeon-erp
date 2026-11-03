package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 이력 VO (tb_screen_review_history, 저장할 때마다 1줄)
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Schema(description = "화면검수 이력")
@Getter
@Setter
public class ScreenReviewHistoryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "일련번호(PK)")
    private Long historyId;

    @Schema(description = "이전 상태")
    private String fromStatus;

    @Schema(description = "새 상태")
    private String toStatus;

    @Schema(description = "검수 의견")
    private String reviewComment;

    @Schema(description = "검수자 이름")
    private String reviewerName;

    @Schema(description = "검수일(YYYY-MM-DD)")
    private String reviewDate;

    @Schema(description = "등록 일시(YYYY-MM-DD HH24:MI:SS)")
    private String createdAt;

    @Schema(description = "요청 번호: 수정요청 줄에만, 화면마다 1부터")
    private Integer requestNo;

    @Schema(description = "첨부 파일")
    private List<ScreenReviewFileVO> files = new ArrayList<>();
}
