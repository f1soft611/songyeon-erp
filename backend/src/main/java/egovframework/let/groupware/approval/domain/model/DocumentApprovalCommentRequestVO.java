package egovframework.let.groupware.approval.domain.model;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "전자결재 사용자 댓글 요청")
public class DocumentApprovalCommentRequestVO {

    @Schema(description = "댓글 내용")
    private String content;

    @Schema(description = "상위 댓글 ID")
    private Long parentCommentId;

    // 2026-11-04 S_ERP 결재 댓글 멘션. 송연은 사번(employees.id) 목록이다
    @Schema(description = "멘션한 사용자 사번 목록")
    private List<String> mentionedUserIds;

    @Schema(description = "문서 접근 사용자 전체 멘션(@ALL)")
    private boolean mentionAll;

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

    public List<String> getMentionedUserIds() {
        return mentionedUserIds;
    }

    public void setMentionedUserIds(List<String> mentionedUserIds) {
        this.mentionedUserIds = mentionedUserIds;
    }

    public boolean isMentionAll() {
        return mentionAll;
    }

    public void setMentionAll(boolean mentionAll) {
        this.mentionAll = mentionAll;
    }
}
