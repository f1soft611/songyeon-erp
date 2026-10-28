package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 공유 넣기 VO 클래스 (document_share 한 줄)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "공유 넣기 VO 클래스 (document_share 한 줄)")
@Getter
@Setter
public class DocShareRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long attachmentId;
    private Long folderId;
    private String toEmployeeId;
    private String sharedBy;
    private String sharedByName;
    private String note;
    private String expiresAt;
    private String createdAt;
}
