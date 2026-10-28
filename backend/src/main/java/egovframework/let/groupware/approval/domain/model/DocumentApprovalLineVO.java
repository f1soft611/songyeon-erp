package egovframework.let.groupware.approval.domain.model;

import java.util.Date;

public class DocumentApprovalLineVO {

    private Long electronicApprovalLineId;
    private Integer stageOrder;
    private Integer participantOrder;
    private String participantType;
    private String participantUserId;
    private String participantName;
    private String participantDepartmentName;
    private String participantProfileImage;
    private String participantStampImage;
    private String actionStatus;
    private Date pendingAt;
    private Date actionAt;
    private String actionComment;

    public Long getElectronicApprovalLineId() { return electronicApprovalLineId; }
    public void setElectronicApprovalLineId(Long electronicApprovalLineId) {
        this.electronicApprovalLineId = electronicApprovalLineId;
    }
    public Integer getStageOrder() { return stageOrder; }
    public void setStageOrder(Integer stageOrder) { this.stageOrder = stageOrder; }
    public Integer getParticipantOrder() { return participantOrder; }
    public void setParticipantOrder(Integer participantOrder) { this.participantOrder = participantOrder; }
    public String getParticipantType() { return participantType; }
    public void setParticipantType(String participantType) { this.participantType = participantType; }
    public String getParticipantUserId() { return participantUserId; }
    public void setParticipantUserId(String participantUserId) { this.participantUserId = participantUserId; }
    public String getParticipantName() { return participantName; }
    public void setParticipantName(String participantName) { this.participantName = participantName; }
    public String getParticipantDepartmentName() { return participantDepartmentName; }
    public void setParticipantDepartmentName(String participantDepartmentName) {
        this.participantDepartmentName = participantDepartmentName;
    }
    public String getParticipantProfileImage() { return participantProfileImage; }
    public void setParticipantProfileImage(String participantProfileImage) {
        this.participantProfileImage = participantProfileImage;
    }
    public String getParticipantStampImage() { return participantStampImage; }
    public void setParticipantStampImage(String participantStampImage) {
        this.participantStampImage = participantStampImage;
    }
    public String getActionStatus() { return actionStatus; }
    public void setActionStatus(String actionStatus) { this.actionStatus = actionStatus; }
    public Date getPendingAt() { return pendingAt; }
    public void setPendingAt(Date pendingAt) { this.pendingAt = pendingAt; }
    public Date getActionAt() { return actionAt; }
    public void setActionAt(Date actionAt) { this.actionAt = actionAt; }
    public String getActionComment() { return actionComment; }
    public void setActionComment(String actionComment) { this.actionComment = actionComment; }
}
