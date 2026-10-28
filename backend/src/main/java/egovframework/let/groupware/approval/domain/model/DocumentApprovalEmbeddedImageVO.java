package egovframework.let.groupware.approval.domain.model;

import java.io.Serializable;

public class DocumentApprovalEmbeddedImageVO implements Serializable {
    private static final long serialVersionUID = 1L;

    private String uploadToken;
    private String fileId;
    private String fileName;
    private String imageUrl;
    private String objectKey;
    private Long fileSize;
    private String mimeType;
    private String width;

    public String getUploadToken() { return uploadToken; }
    public void setUploadToken(String uploadToken) { this.uploadToken = uploadToken; }
    public String getFileId() { return fileId; }
    public void setFileId(String fileId) { this.fileId = fileId; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getObjectKey() { return objectKey; }
    public void setObjectKey(String objectKey) { this.objectKey = objectKey; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public String getWidth() { return width; }
    public void setWidth(String width) { this.width = width; }
}
