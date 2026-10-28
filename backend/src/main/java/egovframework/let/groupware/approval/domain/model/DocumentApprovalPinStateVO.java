package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalPinStateVO {

    private Long electronicApprovalId;
    private boolean pinned;

    public Long getElectronicApprovalId() {
        return electronicApprovalId;
    }

    public void setElectronicApprovalId(Long electronicApprovalId) {
        this.electronicApprovalId = electronicApprovalId;
    }

    public boolean isPinned() {
        return pinned;
    }

    public void setPinned(boolean pinned) {
        this.pinned = pinned;
    }
}
