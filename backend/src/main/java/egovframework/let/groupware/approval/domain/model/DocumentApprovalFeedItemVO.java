package egovframework.let.groupware.approval.domain.model;

import java.util.ArrayList;
import java.util.List;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonFileVO;

public class DocumentApprovalFeedItemVO extends DocumentApprovalListItemVO {

    private Long draftingWorkCategoryId;
    private String contentsJson;
    private String contentsHtml;
    private String contentsText;
    private String drafterProfileImage;
    private Integer viewCount;
    private List<DocumentApprovalLineVO> approvalLines = new ArrayList<>();
    private List<CommonFileVO> attachments = new ArrayList<>();
    private List<CommonCommentVO> systemEvents = new ArrayList<>();
    private List<CommonCommentVO> comments = new ArrayList<>();
    private long commentCount;
    private boolean hasPreviousComments;
    private Long nextBeforeCommentId;

    public Long getDraftingWorkCategoryId() { return draftingWorkCategoryId; }
    public void setDraftingWorkCategoryId(Long draftingWorkCategoryId) {
        this.draftingWorkCategoryId = draftingWorkCategoryId;
    }
    public String getContentsJson() { return contentsJson; }
    public void setContentsJson(String contentsJson) { this.contentsJson = contentsJson; }
    public String getContentsHtml() { return contentsHtml; }
    public void setContentsHtml(String contentsHtml) { this.contentsHtml = contentsHtml; }
    public String getContentsText() { return contentsText; }
    public void setContentsText(String contentsText) { this.contentsText = contentsText; }
    public String getDrafterProfileImage() { return drafterProfileImage; }
    public void setDrafterProfileImage(String drafterProfileImage) {
        this.drafterProfileImage = drafterProfileImage;
    }
    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    public List<DocumentApprovalLineVO> getApprovalLines() { return approvalLines; }
    public void setApprovalLines(List<DocumentApprovalLineVO> approvalLines) {
        this.approvalLines = approvalLines == null ? new ArrayList<>() : approvalLines;
    }
    public List<CommonFileVO> getAttachments() { return attachments; }
    public void setAttachments(List<CommonFileVO> attachments) {
        this.attachments = attachments == null ? new ArrayList<>() : attachments;
    }
    public List<CommonCommentVO> getSystemEvents() { return systemEvents; }
    public void setSystemEvents(List<CommonCommentVO> systemEvents) {
        this.systemEvents = systemEvents == null ? new ArrayList<>() : systemEvents;
    }
    public List<CommonCommentVO> getComments() { return comments; }
    public void setComments(List<CommonCommentVO> comments) {
        this.comments = comments == null ? new ArrayList<>() : comments;
    }
    public long getCommentCount() { return commentCount; }
    public void setCommentCount(long commentCount) { this.commentCount = commentCount; }
    public boolean isHasPreviousComments() { return hasPreviousComments; }
    public void setHasPreviousComments(boolean hasPreviousComments) {
        this.hasPreviousComments = hasPreviousComments;
    }
    public Long getNextBeforeCommentId() { return nextBeforeCommentId; }
    public void setNextBeforeCommentId(Long nextBeforeCommentId) {
        this.nextBeforeCommentId = nextBeforeCommentId;
    }
}
