package egovframework.let.groupware.approval.domain.model;

import java.util.Date;

public class DocumentApprovalDraftVO {

    private Long electronicApprovalId;
    private String documentNo;
    private String eabusNo;
    private String documentStatus;
    private Date submittedAt;

    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) { this.electronicApprovalId = electronicApprovalId; }
    public String getDocumentNo() { return documentNo; }
    public void setDocumentNo(String documentNo) { this.documentNo = documentNo; }
    public String getEabusNo() { return eabusNo; }
    public void setEabusNo(String eabusNo) { this.eabusNo = eabusNo; }
    public String getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(String documentStatus) { this.documentStatus = documentStatus; }
    public Date getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Date submittedAt) { this.submittedAt = submittedAt; }
}
