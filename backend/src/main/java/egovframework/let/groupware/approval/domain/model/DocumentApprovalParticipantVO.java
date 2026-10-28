package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalParticipantVO {

    private String userId;
    private String userName;
    private String departmentName;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
}
