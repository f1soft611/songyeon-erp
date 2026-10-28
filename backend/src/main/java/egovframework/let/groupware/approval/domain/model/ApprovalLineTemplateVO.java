package egovframework.let.groupware.approval.domain.model;

import java.util.Date;
import java.util.List;

public class ApprovalLineTemplateVO {

    private Long templateId;
    private String name;
    private String eabusNo;
    private Date updatedAt;
    private List<ApprovalLineTemplateLineVO> approvalLines;

    public Long getTemplateId() { return templateId; }
    public void setTemplateId(Long templateId) { this.templateId = templateId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEabusNo() { return eabusNo; }
    public void setEabusNo(String eabusNo) { this.eabusNo = eabusNo; }
    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
    public List<ApprovalLineTemplateLineVO> getApprovalLines() { return approvalLines; }
    public void setApprovalLines(List<ApprovalLineTemplateLineVO> approvalLines) {
        this.approvalLines = approvalLines;
    }
}
