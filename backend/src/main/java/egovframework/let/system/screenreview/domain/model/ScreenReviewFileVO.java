package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 첨부 VO (tb_common_file 의 SCREEN_REVIEW · SCREEN_REVIEW_DRAFT 행)
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Schema(description = "화면검수 첨부")
@Getter
@Setter
public class ScreenReviewFileVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "파일 번호(tb_common_file.file_id)")
    private Long fileId;

    @Schema(description = "소유자 번호(이력이면 history_id, 임시저장이면 draft_id)")
    private Long ownerId;

    @Schema(description = "원본 파일명")
    private String fileName;

    @Schema(description = "파일 크기(byte)")
    private Long fileSize;
}
