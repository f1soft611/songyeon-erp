package egovframework.let.groupware.approval.domain.model;

import java.util.Date;

public class DocumentApprovalReferenceConfirmationVO {

    private Long electronicApprovalId;
    private String actionStatus;
    private Date actionAt;

    public Long getElectronicApprovalId() {
        return electronicApprovalId;
    }

    public void setElectronicApprovalId(Long electronicApprovalId) {
        this.electronicApprovalId = electronicApprovalId;
    }

    public String getActionStatus() {
        return actionStatus;
    }

    public void setActionStatus(String actionStatus) {
        this.actionStatus = actionStatus;
    }

    public Date getActionAt() {
        return actionAt;
    }

    public void setActionAt(Date actionAt) {
        this.actionAt = actionAt;
    }
}
