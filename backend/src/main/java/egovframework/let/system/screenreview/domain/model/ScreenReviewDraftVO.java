package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 임시저장 VO (tb_screen_review_draft, 화면 + 작성자당 1줄). 상태 칸이 없다: 임시저장으로는 상태를 바꿀 수 없다
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Schema(description = "화면검수 임시저장")
@Getter
@Setter
public class ScreenReviewDraftVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "일련번호(PK). 첨부를 올릴 때 소유자 번호로 쓴다")
    private Long draftId;

    @Schema(description = "임시저장한 의견")
    private String reviewComment;

    @Schema(description = "마지막 임시저장 일시(YYYY-MM-DD HH24:MI:SS)")
    private String updatedAt;

    @Schema(description = "첨부 파일")
    private List<ScreenReviewFileVO> files = new ArrayList<>();
}
