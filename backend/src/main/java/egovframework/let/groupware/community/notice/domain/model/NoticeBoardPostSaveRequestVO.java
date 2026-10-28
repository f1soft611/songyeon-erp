package egovframework.let.groupware.community.notice.domain.model;

import java.io.Serializable;
import java.util.List;

import org.springframework.util.StringUtils;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Generated;

@Schema(description = "공지사항 저장 요청 모델")
public class NoticeBoardPostSaveRequestVO implements Serializable {
    private static final long serialVersionUID = 1L;

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
    @Schema(description = "첨부파일 ID 목록")
    private List<Long> attachmentIds;
    @Schema(description = "본문 임베드 이미지 메타데이터")
    private List<NoticeEmbeddedImageVO> embeddedImages;
    @Schema(description = "이번 작성 세션에서 업로드한 임시 이미지")
    private List<NoticeEmbeddedImageVO> temporaryImages;

    public String getEffectiveContentsHtml() {
        return StringUtils.hasText(this.contentsHtml) ? this.contentsHtml : this.contents;
    }

    public String getEffectiveContentsJson() {
        return StringUtils.hasText(this.contentsJson) ? this.contentsJson : "{\"type\":\"doc\",\"content\":[]}";
    }

    public String getEffectiveContentsText() {
        if (StringUtils.hasText(this.contentsText)) {
            return this.contentsText.trim();
        }
        String html = this.getEffectiveContentsHtml();
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
    public String getIsPinned() {
        return isPinned;
    }

    @Generated
    public void setIsPinned(String isPinned) {
        this.isPinned = isPinned;
    }

    @Generated
    public List<Long> getAttachmentIds() {
        return attachmentIds;
    }

    @Generated
    public void setAttachmentIds(List<Long> attachmentIds) {
        this.attachmentIds = attachmentIds;
    }

    public List<NoticeEmbeddedImageVO> getEmbeddedImages() {
        return embeddedImages;
    }

    public void setEmbeddedImages(List<NoticeEmbeddedImageVO> embeddedImages) {
        this.embeddedImages = embeddedImages;
    }

    public List<NoticeEmbeddedImageVO> getTemporaryImages() {
        return temporaryImages;
    }

    public void setTemporaryImages(List<NoticeEmbeddedImageVO> temporaryImages) {
        this.temporaryImages = temporaryImages;
    }
}
