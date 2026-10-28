package egovframework.let.groupware.approval.domain.model;

import java.util.List;

public class ApprovalLineTemplateSaveRequestVO {

    private String eabusNo;
    private String name;
    private List<ApprovalLineTemplateLineVO> approvalLines;

    public String getEabusNo() { return eabusNo; }
    public void setEabusNo(String eabusNo) { this.eabusNo = eabusNo; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public List<ApprovalLineTemplateLineVO> getApprovalLines() { return approvalLines; }
    public void setApprovalLines(List<ApprovalLineTemplateLineVO> approvalLines) {
        this.approvalLines = approvalLines;
    }
}
