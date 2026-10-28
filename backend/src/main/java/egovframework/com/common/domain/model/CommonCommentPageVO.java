package egovframework.com.common.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "공통 댓글 페이지 응답 모델")
public class CommonCommentPageVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "댓글 목록")
    private List<CommonCommentVO> comments = new ArrayList<>();
    @Schema(description = "이전 댓글 페이지 존재 여부")
    private boolean hasPrevious;
    @Schema(description = "다음 이전 댓글 조회용 커서")
    private Long nextBeforeCommentId;
    @Schema(description = "전체 댓글 루트 수")
    private long resultCnt;

    public List<CommonCommentVO> getComments() {
        return comments;
    }

    public void setComments(List<CommonCommentVO> comments) {
        this.comments = comments;
    }

    public boolean isHasPrevious() {
        return hasPrevious;
    }

    public void setHasPrevious(boolean hasPrevious) {
        this.hasPrevious = hasPrevious;
    }

    public Long getNextBeforeCommentId() {
        return nextBeforeCommentId;
    }

    public void setNextBeforeCommentId(Long nextBeforeCommentId) {
        this.nextBeforeCommentId = nextBeforeCommentId;
    }

    public long getResultCnt() {
        return resultCnt;
    }

    public void setResultCnt(long resultCnt) {
        this.resultCnt = resultCnt;
    }
}
