package egovframework.let.groupware.approval.domain.model;

import java.util.ArrayList;
import java.util.List;

public class DocumentApprovalSummaryVO {

    private Long actionRequiredCount = 0L;
    private Long inProgressCount = 0L;
    private Long draftCount = 0L;
    private Long completedCount = 0L;
    private Long revisionRequestedCount = 0L;
    private Long rejectedCount = 0L;
    private List<DocumentApprovalListItemVO> notices = new ArrayList<>();
    private Long referenceConfirmationRequiredCount;
    private List<DocumentApprovalListItemVO> referenceConfirmationItems;
    private Long finalConfirmationRequiredCount;
    private List<DocumentApprovalListItemVO> finalConfirmationItems;

    public Long getActionRequiredCount() { return actionRequiredCount; }
    public void setActionRequiredCount(Long actionRequiredCount) { this.actionRequiredCount = actionRequiredCount; }
    public Long getInProgressCount() { return inProgressCount; }
    public void setInProgressCount(Long inProgressCount) { this.inProgressCount = inProgressCount; }
    public Long getDraftCount() { return draftCount; }
    public void setDraftCount(Long draftCount) { this.draftCount = draftCount; }
    public Long getCompletedCount() { return completedCount; }
    public void setCompletedCount(Long completedCount) { this.completedCount = completedCount; }
    public Long getRevisionRequestedCount() { return revisionRequestedCount; }
    public void setRevisionRequestedCount(Long revisionRequestedCount) {
        this.revisionRequestedCount = revisionRequestedCount;
    }
    public Long getRejectedCount() { return rejectedCount; }
    public void setRejectedCount(Long rejectedCount) { this.rejectedCount = rejectedCount; }
    public List<DocumentApprovalListItemVO> getNotices() { return notices; }
    public void setNotices(List<DocumentApprovalListItemVO> notices) { this.notices = notices; }
    public Long getReferenceConfirmationRequiredCount() { return referenceConfirmationRequiredCount; }
    public void setReferenceConfirmationRequiredCount(Long referenceConfirmationRequiredCount) {
        this.referenceConfirmationRequiredCount = referenceConfirmationRequiredCount;
    }
    public List<DocumentApprovalListItemVO> getReferenceConfirmationItems() { return referenceConfirmationItems; }
    public void setReferenceConfirmationItems(List<DocumentApprovalListItemVO> referenceConfirmationItems) {
        this.referenceConfirmationItems = referenceConfirmationItems;
    }
    public Long getFinalConfirmationRequiredCount() { return finalConfirmationRequiredCount; }
    public void setFinalConfirmationRequiredCount(Long finalConfirmationRequiredCount) {
        this.finalConfirmationRequiredCount = finalConfirmationRequiredCount;
    }
    public List<DocumentApprovalListItemVO> getFinalConfirmationItems() { return finalConfirmationItems; }
    public void setFinalConfirmationItems(List<DocumentApprovalListItemVO> finalConfirmationItems) {
        this.finalConfirmationItems = finalConfirmationItems;
    }
}
