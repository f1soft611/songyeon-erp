package egovframework.let.groupware.approval.domain.model;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "전자결재 사용자 댓글 요청")
public class DocumentApprovalCommentRequestVO {

    @Schema(description = "댓글 내용")
    private String content;

    @Schema(description = "상위 댓글 ID")
    private Long parentCommentId;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getParentCommentId() {
        return parentCommentId;
    }

    public void setParentCommentId(Long parentCommentId) {
        this.parentCommentId = parentCommentId;
    }
}
