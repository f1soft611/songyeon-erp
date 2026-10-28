package egovframework.let.groupware.approval.domain.model;

public class DocumentApprovalWorkflowDocumentVO {

    private Long electronicApprovalId;
    private String documentType;
    private String documentStatus;
    private String drafterId;

    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) { this.electronicApprovalId = electronicApprovalId; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(String documentStatus) { this.documentStatus = documentStatus; }
    public String getDrafterId() { return drafterId; }
    public void setDrafterId(String drafterId) { this.drafterId = drafterId; }
}
