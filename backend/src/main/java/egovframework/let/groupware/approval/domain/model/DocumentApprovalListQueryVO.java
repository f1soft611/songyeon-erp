package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalListQueryVO {

    private String keyword;
    private Long electronicApprovalId;
    private String eabusNo;
    private String title;
    private String documentType;
    private String documentStatus;
    private String submittedAtFrom;
    private String submittedAtTo;
    private String drafterName;
    private String drafterDepartmentName;
    private String participantName;
    private String myParticipantType;
    private String myActionStatus;
    private String currentApproverName;
    private String updatedAtFrom;
    private String updatedAtTo;
    private Integer offset;
    private Integer limit;
    private String sortField;
    private String sortDirection;

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }
    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) {
        this.electronicApprovalId = electronicApprovalId;
    }
    public String getEabusNo() { return eabusNo; }
    public void setEabusNo(String eabusNo) { this.eabusNo = eabusNo; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(String documentStatus) { this.documentStatus = documentStatus; }
    public String getSubmittedAtFrom() { return submittedAtFrom; }
    public void setSubmittedAtFrom(String submittedAtFrom) { this.submittedAtFrom = submittedAtFrom; }
    public String getSubmittedAtTo() { return submittedAtTo; }
    public void setSubmittedAtTo(String submittedAtTo) { this.submittedAtTo = submittedAtTo; }
    public String getDrafterName() { return drafterName; }
    public void setDrafterName(String drafterName) { this.drafterName = drafterName; }
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
    public String getCurrentApproverName() { return currentApproverName; }
    public void setCurrentApproverName(String currentApproverName) {
        this.currentApproverName = currentApproverName;
    }
    public String getUpdatedAtFrom() { return updatedAtFrom; }
    public void setUpdatedAtFrom(String updatedAtFrom) { this.updatedAtFrom = updatedAtFrom; }
    public String getUpdatedAtTo() { return updatedAtTo; }
    public void setUpdatedAtTo(String updatedAtTo) { this.updatedAtTo = updatedAtTo; }
    public Integer getOffset() { return offset; }
    public void setOffset(Integer offset) { this.offset = offset; }
    public Integer getLimit() { return limit; }
    public void setLimit(Integer limit) { this.limit = limit; }
    public String getSortField() { return sortField; }
    public void setSortField(String sortField) { this.sortField = sortField; }
    public String getSortDirection() { return sortDirection; }
    public void setSortDirection(String sortDirection) { this.sortDirection = sortDirection; }

    public boolean isPageRequest() {
        return offset != null || limit != null || sortField != null || sortDirection != null
                || hasText(keyword) || electronicApprovalId != null || hasText(eabusNo) || hasText(title)
                || hasText(documentType)
                || hasText(documentStatus) || hasText(submittedAtFrom) || hasText(submittedAtTo)
                || hasText(drafterName) || hasText(drafterDepartmentName)
                || hasText(participantName) || hasText(myParticipantType) || hasText(myActionStatus)
                || hasText(currentApproverName) || hasText(updatedAtFrom) || hasText(updatedAtTo);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
