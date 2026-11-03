package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 현황 VO (tb_screen_review, 화면당 1줄)
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Schema(description = "화면검수 현황")
@Getter
@Setter
public class ScreenReviewVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "일련번호(PK)")
    private Long reviewId;

    @Schema(description = "검수 상태: NOT_STARTED 미검수, IN_PROGRESS 검수진행중, CHANGE_REQUESTED 수정요청, COMPLETED 검수완료")
    private String reviewStatus;

    @Schema(description = "마지막 검수자 이름")
    private String reviewerName;

    @Schema(description = "마지막 검수일(YYYY-MM-DD)")
    private String reviewDate;

    @Schema(description = "요청일: 마지막으로 수정요청을 저장한 날(YYYY-MM-DD)")
    private String requestDate;

    @Schema(description = "개발담당(개발사가 따로 넣는다)")
    private String developerName;

    @Schema(description = "개발완료일(YYYY-MM-DD, 개발사가 따로 넣는다)")
    private String devCompletedDate;
}
