package egovframework.let.groupware.approval.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import egovframework.com.common.domain.model.CommonCommentVO;

public class DocumentApprovalCommentPageVO implements Serializable {
    private static final long serialVersionUID = 1L;

    private List<CommonCommentVO> comments = new ArrayList<>();
    private List<CommonCommentVO> systemEvents = new ArrayList<>();
    private boolean hasPrevious;
    private Long nextBeforeCommentId;
    private long resultCnt;

    public List<CommonCommentVO> getComments() {
        return comments;
    }

    public void setComments(List<CommonCommentVO> comments) {
        this.comments = comments == null ? new ArrayList<>() : comments;
    }

    public List<CommonCommentVO> getSystemEvents() {
        return systemEvents;
    }

    public void setSystemEvents(List<CommonCommentVO> systemEvents) {
        this.systemEvents = systemEvents == null ? new ArrayList<>() : systemEvents;
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
