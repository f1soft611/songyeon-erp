package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 공유 보내기 요청 VO 클래스 (문서 하나 또는 폴더 하나)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "공유 보내기 요청 VO 클래스 (문서 하나 또는 폴더 하나)")
@Getter
@Setter
public class DocShareRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long attachmentId;
    private Long folderId;
    private List<String> toEmployeeIds;
    private String note;
    private String expiresAt;
}
