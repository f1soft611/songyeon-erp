package egovframework.let.groupware.approval.domain.model;

import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

public class DocumentApprovalDraftSaveRequestVO {

    private String documentType;
    private Long draftingWorkCategoryId;
    private String title;
    private JsonNode contentsJson;
    private String contentsHtml;
    private String contentsText;
    private List<ApprovalLineVO> approvalLines;
    private List<DocumentApprovalEmbeddedImageVO> embeddedImages;
    private List<DocumentApprovalEmbeddedImageVO> temporaryImages;

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public Long getDraftingWorkCategoryId() { return draftingWorkCategoryId; }
    public void setDraftingWorkCategoryId(Long draftingWorkCategoryId) { this.draftingWorkCategoryId = draftingWorkCategoryId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public JsonNode getContentsJson() { return contentsJson; }
    public void setContentsJson(JsonNode contentsJson) { this.contentsJson = contentsJson; }
    public String getContentsHtml() { return contentsHtml; }
    public void setContentsHtml(String contentsHtml) { this.contentsHtml = contentsHtml; }
    public String getContentsText() { return contentsText; }
    public void setContentsText(String contentsText) { this.contentsText = contentsText; }
    public List<ApprovalLineVO> getApprovalLines() { return approvalLines; }
    public void setApprovalLines(List<ApprovalLineVO> approvalLines) { this.approvalLines = approvalLines; }
    public List<DocumentApprovalEmbeddedImageVO> getEmbeddedImages() { return embeddedImages; }
    public void setEmbeddedImages(List<DocumentApprovalEmbeddedImageVO> embeddedImages) {
        this.embeddedImages = embeddedImages;
    }
    public List<DocumentApprovalEmbeddedImageVO> getTemporaryImages() { return temporaryImages; }
    public void setTemporaryImages(List<DocumentApprovalEmbeddedImageVO> temporaryImages) {
        this.temporaryImages = temporaryImages;
    }

    public static class ApprovalLineVO {
        private Integer stageOrder;
        private Integer participantOrder;
        private String participantType;
        private String participantUserId;

        public Integer getStageOrder() { return stageOrder; }
        public void setStageOrder(Integer stageOrder) { this.stageOrder = stageOrder; }
        public Integer getParticipantOrder() { return participantOrder; }
        public void setParticipantOrder(Integer participantOrder) { this.participantOrder = participantOrder; }
        public String getParticipantType() { return participantType; }
        public void setParticipantType(String participantType) { this.participantType = participantType; }
        public String getParticipantUserId() { return participantUserId; }
        public void setParticipantUserId(String participantUserId) { this.participantUserId = participantUserId; }
    }
}
