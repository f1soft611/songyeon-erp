package egovframework.let.groupware.approval.domain.model;

import java.util.Date;

public class DocumentApprovalFileItemVO {
    private Long fileId;
    private String fileName;
    private long fileSize;
    private String mimeType;
    private String uploadedByName;
    private Date createdAt;
    private Long electronicApprovalId;
    private String documentTitle;
    private Long commentId;

    public Long getFileId() { return fileId; }
    public void setFileId(Long fileId) { this.fileId = fileId; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public String getUploadedByName() { return uploadedByName; }
    public void setUploadedByName(String uploadedByName) { this.uploadedByName = uploadedByName; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public Long getElectronicApprovalId() { return electronicApprovalId; }
    public void setElectronicApprovalId(Long electronicApprovalId) { this.electronicApprovalId = electronicApprovalId; }
    public String getDocumentTitle() { return documentTitle; }
    public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }
    public Long getCommentId() { return commentId; }
    public void setCommentId(Long commentId) { this.commentId = commentId; }
}
