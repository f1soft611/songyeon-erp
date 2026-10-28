package egovframework.let.groupware.approval.domain.model;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonProperty;

public class DocumentApprovalListItemVO {

    private Long electronicApprovalId;
    private String eabusNo;
    private String documentType;
    private String documentStatus;
    private String title;
    private String drafterName;
    private Date createdAt;
    private Date updatedAt;
    private Date submittedAt;
    private String summary;
    private String noticeType;
    private boolean drafter;

    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) { this.electronicApprovalId = electronicApprovalId; }
    public String getEabusNo() { return eabusNo; }
    public void setEabusNo(String eabusNo) { this.eabusNo = eabusNo; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(String documentStatus) { this.documentStatus = documentStatus; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDrafterName() { return drafterName; }
    public void setDrafterName(String drafterName) { this.drafterName = drafterName; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
    public Date getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Date submittedAt) { this.submittedAt = submittedAt; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getNoticeType() { return noticeType; }
    public void setNoticeType(String noticeType) { this.noticeType = noticeType; }
    @JsonProperty("isDrafter")
    public boolean isDrafter() { return drafter; }
    @JsonProperty("isDrafter")
    public void setDrafter(boolean drafter) { this.drafter = drafter; }
}
