package egovframework.com.common.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공통 파일 모델")
public class CommonFileVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "파일 ID")
    private Long fileId;
    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "소유 유형")
    private String ownerType;
    @Schema(description = "소유 ID")
    private Long ownerId;
    @Schema(description = "원본 파일명")
    private String fileName;
    @Schema(description = "저장 경로")
    private String filePath;
    @Schema(description = "스토리지 객체 키")
    private String objectKey;
    @Schema(description = "버킷명")
    private String bucketName;
    @Schema(description = "저장소 제공자")
    private String storageProvider;
    @Schema(description = "파일 크기")
    private Long fileSize;
    @Schema(description = "MIME 타입")
    private String mimeType;
    @Schema(description = "콘텐츠 타입")
    private String contentType;
    @Schema(description = "파일 사용 용도")
    private String fileUsageType;
    @Schema(description = "업로더 ID")
    private String uploadedBy;
    @Schema(description = "삭제 여부")
    private String deletedYn;
    @Schema(description = "생성 일시")
    private Date createdAt;
    @Schema(description = "수정 일시")
    private Date updatedAt;

    @Generated
    public Long getFileId() { return fileId; }
    @Generated
    public void setFileId(Long fileId) { this.fileId = fileId; }
    @Generated
    public Long getTenantId() { return tenantId; }
    @Generated
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    @Generated
    public String getOwnerType() { return ownerType; }
    @Generated
    public void setOwnerType(String ownerType) { this.ownerType = ownerType; }
    @Generated
    public Long getOwnerId() { return ownerId; }
    @Generated
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    @Generated
    public String getFileName() { return fileName; }
    @Generated
    public void setFileName(String fileName) { this.fileName = fileName; }
    @Generated
    public String getFilePath() { return filePath; }
    @Generated
    public void setFilePath(String filePath) { this.filePath = filePath; }
    @Generated
    public String getObjectKey() { return objectKey; }
    @Generated
    public void setObjectKey(String objectKey) { this.objectKey = objectKey; }
    @Generated
    public String getBucketName() { return bucketName; }
    @Generated
    public void setBucketName(String bucketName) { this.bucketName = bucketName; }
    @Generated
    public String getStorageProvider() { return storageProvider; }
    @Generated
    public void setStorageProvider(String storageProvider) { this.storageProvider = storageProvider; }
    @Generated
    public Long getFileSize() { return fileSize; }
    @Generated
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    @Generated
    public String getMimeType() { return mimeType; }
    @Generated
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    @Generated
    public String getContentType() { return contentType; }
    @Generated
    public void setContentType(String contentType) { this.contentType = contentType; }
    @Generated
    public String getFileUsageType() { return fileUsageType; }
    @Generated
    public void setFileUsageType(String fileUsageType) { this.fileUsageType = fileUsageType; }
    @Generated
    public String getUploadedBy() { return uploadedBy; }
    @Generated
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
    @Generated
    public String getDeletedYn() { return deletedYn; }
    @Generated
    public void setDeletedYn(String deletedYn) { this.deletedYn = deletedYn; }
    @Generated
    public Date getCreatedAt() { return createdAt; }
    @Generated
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    @Generated
    public Date getUpdatedAt() { return updatedAt; }
    @Generated
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
