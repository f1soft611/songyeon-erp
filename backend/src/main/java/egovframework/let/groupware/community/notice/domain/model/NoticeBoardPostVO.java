package egovframework.let.groupware.community.notice.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.springframework.util.StringUtils;

import egovframework.com.common.domain.model.CommonCommentVO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공지사항 응답 모델")
public class NoticeBoardPostVO implements Serializable {
    private static final long serialVersionUID = 1L;

    @Schema(description = "공지 ID")
    private Long postId;
    @Schema(description = "게시판 유형 코드")
    private String boardTypeCode;
    @Schema(description = "공지 제목")
    private String title;
    @Schema(description = "공지 구분 공통코드")
    private String noticeGubunCode;
    @Schema(description = "기존 호환용 본문 HTML")
    private String contents;
    @Schema(description = "에디터 HTML 본문")
    private String contentsHtml;
    @Schema(description = "에디터 JSON 본문")
    private String contentsJson;
    @Schema(description = "본문 텍스트 추출값")
    private String contentsText;
    @Schema(description = "작성자 ID")
    private String writerId;
    @Schema(description = "작성자명")
    private String writerName;
    @Schema(description = "작성자 프로필 이미지")
    private String writerProfileImage;
    @Schema(description = "마지막 행위자 ID")
    private String lastModifiedBy;
    @Schema(description = "마지막 행위자명")
    private String lastModifiedByName;
    @Schema(description = "조회 수")
    private Integer viewCount;
    @Schema(description = "상단 고정 여부")
    private String isPinned;
    @Schema(description = "로그인 팝업 여부 Y/N")
    private String loginPopupYn;
    @Schema(description = "팝업 종료일 YYYY-MM-DD")
    private String popupEndDate;

    public String getLoginPopupYn() { return loginPopupYn; }
    public void setLoginPopupYn(String loginPopupYn) { this.loginPopupYn = loginPopupYn; }
    public String getPopupEndDate() { return popupEndDate; }
    public void setPopupEndDate(String popupEndDate) { this.popupEndDate = popupEndDate; }
    @Schema(description = "삭제 여부")
    private String isDeleted;
    @Schema(description = "등록 일시")
    private Date createdAt;
    @Schema(description = "수정 일시")
    private Date updatedAt;
    @Schema(description = "첨부파일 수")
    private Integer attachmentCount;
    @Schema(description = "첨부파일 목록")
    private List<NoticeBoardFileVO> attachments = new ArrayList<>();
    @Schema(description = "댓글 수")
    private Integer commentCount;
    @Schema(description = "댓글 목록")
    private List<CommonCommentVO> comments = new ArrayList<>();
    @Schema(description = "이전 댓글 존재 여부")
    private boolean hasPreviousComments;
    @Schema(description = "이전 댓글 조회용 커서")
    private Long nextBeforeCommentId;

    public String getEffectiveContentsHtml() {
        if (StringUtils.hasText(this.contentsHtml)) {
            return this.contentsHtml;
        }
        return this.contents;
    }

    public String getEffectiveContentsText() {
        if (StringUtils.hasText(this.contentsText)) {
            return this.contentsText.trim();
        }
        String html = getEffectiveContentsHtml();
        if (!StringUtils.hasText(html)) {
            return "";
        }
        String plainText = html.replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replaceAll("<[^>]*>", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return plainText;
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
    public String getBoardTypeCode() {
        return boardTypeCode;
    }

    @Generated
    public void setBoardTypeCode(String boardTypeCode) {
        this.boardTypeCode = boardTypeCode;
    }

    @Generated
    public String getTitle() {
        return title;
    }

    @Generated
    public void setTitle(String title) {
        this.title = title;
    }

    @Generated
    public String getNoticeGubunCode() {
        return noticeGubunCode;
    }

    @Generated
    public void setNoticeGubunCode(String noticeGubunCode) {
        this.noticeGubunCode = noticeGubunCode;
    }

    @Generated
    public String getContents() {
        return contents;
    }

    @Generated
    public void setContents(String contents) {
        this.contents = contents;
    }

    @Generated
    public String getContentsHtml() {
        return contentsHtml;
    }

    @Generated
    public void setContentsHtml(String contentsHtml) {
        this.contentsHtml = contentsHtml;
    }

    @Generated
    public String getContentsJson() {
        return contentsJson;
    }

    @Generated
    public void setContentsJson(String contentsJson) {
        this.contentsJson = contentsJson;
    }

    @Generated
    public String getContentsText() {
        return contentsText;
    }

    @Generated
    public void setContentsText(String contentsText) {
        this.contentsText = contentsText;
    }

    @Generated
    public String getWriterId() {
        return writerId;
    }

    @Generated
    public void setWriterId(String writerId) {
        this.writerId = writerId;
    }

    @Generated
    public String getWriterName() {
        return writerName;
    }

    @Generated
    public void setWriterName(String writerName) {
        this.writerName = writerName;
    }

    @Generated
    public String getWriterProfileImage() {
        return writerProfileImage;
    }

    @Generated
    public void setWriterProfileImage(String writerProfileImage) {
        this.writerProfileImage = writerProfileImage;
    }

    @Generated
    public String getLastModifiedBy() {
        return lastModifiedBy;
    }

    @Generated
    public void setLastModifiedBy(String lastModifiedBy) {
        this.lastModifiedBy = lastModifiedBy;
    }

    @Generated
    public String getLastModifiedByName() {
        return lastModifiedByName;
    }

    @Generated
    public void setLastModifiedByName(String lastModifiedByName) {
        this.lastModifiedByName = lastModifiedByName;
    }

    @Generated
    public Integer getViewCount() {
        return viewCount;
    }

    @Generated
    public void setViewCount(Integer viewCount) {
        this.viewCount = viewCount;
    }

    @Generated
    public String getIsPinned() {
        return isPinned;
    }

    @Generated
    public void setIsPinned(String isPinned) {
        this.isPinned = isPinned;
    }

    @Generated
    public String getIsDeleted() {
        return isDeleted;
    }

    @Generated
    public void setIsDeleted(String isDeleted) {
        this.isDeleted = isDeleted;
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

    @Generated
    public Integer getAttachmentCount() {
        return attachmentCount;
    }

    @Generated
    public void setAttachmentCount(Integer attachmentCount) {
        this.attachmentCount = attachmentCount;
    }

    @Generated
    public List<NoticeBoardFileVO> getAttachments() {
        return attachments;
    }

    @Generated
    public void setAttachments(List<NoticeBoardFileVO> attachments) {
        this.attachments = attachments;
    }

    @Generated
    public Integer getCommentCount() {
        return commentCount;
    }

    @Generated
    public void setCommentCount(Integer commentCount) {
        this.commentCount = commentCount;
    }

    @Generated
    public List<CommonCommentVO> getComments() {
        return comments;
    }

    @Generated
    public void setComments(List<CommonCommentVO> comments) {
        this.comments = comments;
    }

    @Generated
    public boolean isHasPreviousComments() {
        return hasPreviousComments;
    }

    @Generated
    public void setHasPreviousComments(boolean hasPreviousComments) {
        this.hasPreviousComments = hasPreviousComments;
    }

    @Generated
    public Long getNextBeforeCommentId() {
        return nextBeforeCommentId;
    }

    @Generated
    public void setNextBeforeCommentId(Long nextBeforeCommentId) {
        this.nextBeforeCommentId = nextBeforeCommentId;
    }
}
