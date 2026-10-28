package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 공유 한 줄 VO 클래스 (송연 /api/document-shares/mine · by-me)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "공유 한 줄 VO 클래스 (송연 /api/document-shares/mine · by-me)")
@Getter
@Setter
public class DocShareVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long attachmentId;
    private Long folderId;
    private String toEmployeeId;
    private String toName;
    private String sharedByName;
    private String note;
    private String expiresAt;
    private String createdAt;
    private String origName;
    private Long sizeBytes;
    private boolean folder;
    private boolean locked;
    private boolean unlocked;
}
