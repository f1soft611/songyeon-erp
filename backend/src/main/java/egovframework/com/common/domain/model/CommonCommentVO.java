package egovframework.com.common.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공통 댓글 모델")
public class CommonCommentVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "댓글 ID")
    private Long commentId;
    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "소유 유형")
    private String ownerType;
    @Schema(description = "소유 ID")
    private Long ownerId;
    @Schema(description = "상위 댓글 ID")
    private Long parentCommentId;
    @Schema(description = "댓글 내용")
    private String content;
    @Schema(description = "댓글 유형")
    private String commentType;
    @Schema(description = "시스템 이벤트 코드")
    private String eventType;
    @Schema(description = "작성자 ID")
    private String writerId;
    @Schema(description = "작성자 이름")
    private String writerName;
    @Schema(description = "작성자 프로필 이미지")
    private String writerProfileImage;
    @Schema(description = "마지막 행위자 ID")
    private String lastModifiedBy;
    @Schema(description = "마지막 행위자 이름")
    private String lastModifiedByName;
    @Schema(description = "삭제 여부")
    private String deletedYn;
    @Schema(description = "생성 일시")
    private Date createdAt;
    @Schema(description = "수정 일시")
    private Date updatedAt;
    @Schema(description = "댓글 첨부파일 목록")
    private List<CommonFileVO> attachments = new ArrayList<>();

    @Generated
    public Long getCommentId() { return commentId; }
    @Generated
    public void setCommentId(Long commentId) { this.commentId = commentId; }
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
    public Long getParentCommentId() { return parentCommentId; }
    @Generated
    public void setParentCommentId(Long parentCommentId) { this.parentCommentId = parentCommentId; }
    @Generated
    public String getContent() { return content; }
    @Generated
    public void setContent(String content) { this.content = content; }
    @Generated
    public String getCommentType() { return commentType; }
    @Generated
    public void setCommentType(String commentType) { this.commentType = commentType; }
    @Generated
    public String getEventType() { return eventType; }
    @Generated
    public void setEventType(String eventType) { this.eventType = eventType; }
    @Generated
    public String getWriterId() { return writerId; }
    @Generated
    public void setWriterId(String writerId) { this.writerId = writerId; }
    @Generated
    public String getWriterName() { return writerName; }
    @Generated
    public void setWriterName(String writerName) { this.writerName = writerName; }
    @Generated
    public String getWriterProfileImage() { return writerProfileImage; }
    @Generated
    public void setWriterProfileImage(String writerProfileImage) {
        this.writerProfileImage = writerProfileImage;
    }
    @Generated
    public String getLastModifiedBy() { return lastModifiedBy; }
    @Generated
    public void setLastModifiedBy(String lastModifiedBy) { this.lastModifiedBy = lastModifiedBy; }
    @Generated
    public String getLastModifiedByName() { return lastModifiedByName; }
    @Generated
    public void setLastModifiedByName(String lastModifiedByName) { this.lastModifiedByName = lastModifiedByName; }
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
    @Generated
    public List<CommonFileVO> getAttachments() { return attachments; }
    @Generated
    public void setAttachments(List<CommonFileVO> attachments) { this.attachments = attachments; }
}
