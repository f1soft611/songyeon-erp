package egovframework.let.groupware.community.notice.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공지사항 첨부파일 모델")
public class NoticeBoardFileVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "첨부파일 ID")
    private Long boardFileId;
    @Schema(description = "공지 ID")
    private Long postId;
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
    @Schema(description = "파일 SHA-256 해시")
    private String checksumSha256;
    @Schema(description = "콘텐츠 타입")
    private String contentType;
    private String fileUsageType;
    @Schema(description = "삭제 여부")
    private String deletedYn;
    @Schema(description = "업로더 ID")
    private String uploadedBy;
    @Schema(description = "생성 일시")
    private Date createdAt;
    @Schema(description = "수정 일시")
    private Date updatedAt;

    @Generated
    public Long getBoardFileId() {
        return boardFileId;
    }

    @Generated
    public void setBoardFileId(Long boardFileId) {
        this.boardFileId = boardFileId;
    }

    @Generated
    public Long getPostId() {
        return postId;
    }

    @Generated
    public void setPostId(Long postId) {
        this.postId = postId;
    }

    @Generated
    public String getFileName() {
        return fileName;
    }

    @Generated
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    @Generated
    public String getFilePath() {
        return filePath;
    }

    @Generated
    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    @Generated
    public String getObjectKey() {
        return objectKey;
    }

    @Generated
    public void setObjectKey(String objectKey) {
        this.objectKey = objectKey;
    }

    @Generated
    public String getBucketName() {
        return bucketName;
    }

    @Generated
    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }

    @Generated
    public String getStorageProvider() {
        return storageProvider;
    }

    @Generated
    public void setStorageProvider(String storageProvider) {
        this.storageProvider = storageProvider;
    }

    @Generated
    public Long getFileSize() {
        return fileSize;
    }

    @Generated
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    @Generated
    public String getMimeType() {
        return mimeType;
    }

    @Generated
    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    @Generated
    public String getChecksumSha256() {
        return checksumSha256;
    }

    @Generated
    public void setChecksumSha256(String checksumSha256) {
        this.checksumSha256 = checksumSha256;
    }

    @Generated
    public String getContentType() {
        return contentType;
    }

    @Generated
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getFileUsageType() {
        return fileUsageType;
    }

    public void setFileUsageType(String fileUsageType) {
        this.fileUsageType = fileUsageType;
    }

    @Generated
    public String getDeletedYn() {
        return deletedYn;
    }

    @Generated
    public void setDeletedYn(String deletedYn) {
        this.deletedYn = deletedYn;
    }

    @Generated
    public String getUploadedBy() {
        return uploadedBy;
    }

    @Generated
    public void setUploadedBy(String uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    @Generated
    public Date getCreatedAt() {
        return createdAt;
    }

    @Generated
    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    @Generated
    public Date getUpdatedAt() {
        return updatedAt;
    }

    @Generated
    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
}
