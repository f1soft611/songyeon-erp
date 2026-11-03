package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 저장 · 임시저장 요청 VO. 검수자는 로그인 사용자, 검수일은 서버의 오늘 날짜로 넣는다
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Schema(description = "화면검수 저장 요청")
@Getter
@Setter
public class ScreenReviewSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "새 상태(저장만). 임시저장은 받지 않는다")
    private String status;

    @Schema(description = "화면을 열 때의 상태(저장만). 그사이 다른 사람이 바꿨으면 저장하지 않는다")
    private String expectedStatus;

    @Schema(description = "검수 의견(500자까지)")
    private String reviewComment;
}
