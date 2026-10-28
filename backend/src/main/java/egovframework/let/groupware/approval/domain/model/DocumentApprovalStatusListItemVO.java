package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalStatusListItemVO extends DocumentApprovalListItemVO {

    private String drafterDepartmentName;
    private String participantName;
    private String myParticipantType;
    private String myActionStatus;
    private String currentApprovalStep;
    private String approvalProgress;

    public String getDrafterDepartmentName() { return drafterDepartmentName; }
    public void setDrafterDepartmentName(String drafterDepartmentName) {
        this.drafterDepartmentName = drafterDepartmentName;
    }
    public String getParticipantName() { return participantName; }
    public void setParticipantName(String participantName) { this.participantName = participantName; }
    public String getMyParticipantType() { return myParticipantType; }
    public void setMyParticipantType(String myParticipantType) { this.myParticipantType = myParticipantType; }
    public String getMyActionStatus() { return myActionStatus; }
    public void setMyActionStatus(String myActionStatus) { this.myActionStatus = myActionStatus; }
    public String getCurrentApprovalStep() { return currentApprovalStep; }
    public void setCurrentApprovalStep(String currentApprovalStep) { this.currentApprovalStep = currentApprovalStep; }
    public String getApprovalProgress() { return approvalProgress; }
    public void setApprovalProgress(String approvalProgress) { this.approvalProgress = approvalProgress; }
}
