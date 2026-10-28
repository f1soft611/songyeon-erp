package egovframework.let.common.attachment.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 첨부 파일 한 개 VO 클래스 (송연 attachment).
 * scope='receiving' 이면 입고 서류(refId = 입고내역 id), scope='document' 이면 문서함(refId = 폴더 id).
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "첨부 파일")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AttachmentVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    @Schema(description = "receiving(입고 서류) | document(문서함)")
    private String scope;
    @Schema(description = "붙인 대상 id(글자)")
    private String refId;
    @Schema(description = "올린 파일 이름(내려받을 때 이 이름으로 준다)")
    private String origName;
    @Schema(description = "디스크에 저장한 이름(epoch_ms_안전한이름)")
    @JsonIgnore
    private String storedName;
    private Long sizeBytes;
    private String uploadedBy;
    private String createdAt;
}
