package egovframework.let.groupware.approval.domain.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonFileVO;

public class DocumentApprovalDetailVO {

    private Long electronicApprovalId;
    private Long draftingWorkCategoryId;
    private String eabusNo;
    private String documentType;
    private String documentStatus;
    private String drafterName;
    private String drafterProfileImage;
    private Date createdAt;
    private Date submittedAt;
    private String title;
    private String contentsJson;
    private String contentsHtml;
    private String contentsText;
    private Integer viewCount;
    private boolean isDrafter;
    private List<CommonFileVO> attachments = new ArrayList<>();
    private List<DocumentApprovalLineVO> approvalLines = new ArrayList<>();
    private List<CommonCommentVO> systemEvents = new ArrayList<>();

    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) { this.electronicApprovalId = electronicApprovalId; }
    public Long getDraftingWorkCategoryId() { return draftingWorkCategoryId; }
    public void setDraftingWorkCategoryId(Long draftingWorkCategoryId) {
        this.draftingWorkCategoryId = draftingWorkCategoryId;
    }
    public String getEabusNo() { return eabusNo; }
    public void setEabusNo(String eabusNo) { this.eabusNo = eabusNo; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(String documentStatus) { this.documentStatus = documentStatus; }
    public String getDrafterName() { return drafterName; }
    public void setDrafterName(String drafterName) { this.drafterName = drafterName; }
    public String getDrafterProfileImage() { return drafterProfileImage; }
    public void setDrafterProfileImage(String drafterProfileImage) {
        this.drafterProfileImage = drafterProfileImage;
    }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public Date getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Date submittedAt) { this.submittedAt = submittedAt; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContentsJson() { return contentsJson; }
    public void setContentsJson(String contentsJson) { this.contentsJson = contentsJson; }
    public String getContentsHtml() { return contentsHtml; }
    public void setContentsHtml(String contentsHtml) { this.contentsHtml = contentsHtml; }
    public String getContentsText() { return contentsText; }
    public void setContentsText(String contentsText) { this.contentsText = contentsText; }
    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    @JsonProperty("isDrafter")
    public boolean isDrafter() { return isDrafter; }
    @JsonProperty("isDrafter")
    public void setDrafter(boolean drafter) { isDrafter = drafter; }
    public List<CommonFileVO> getAttachments() { return attachments; }
    public void setAttachments(List<CommonFileVO> attachments) { this.attachments = attachments; }
    public List<DocumentApprovalLineVO> getApprovalLines() { return approvalLines; }
    public void setApprovalLines(List<DocumentApprovalLineVO> approvalLines) { this.approvalLines = approvalLines; }
    public List<CommonCommentVO> getSystemEvents() { return systemEvents; }
    public void setSystemEvents(List<CommonCommentVO> systemEvents) { this.systemEvents = systemEvents; }
}
