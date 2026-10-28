package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 폴더 안 파일 VO 클래스 (송연 /api/doc-folders/{id}/files)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "폴더 안 파일 VO 클래스 (송연 /api/doc-folders/{id}/files)")
@Getter
@Setter
public class DocFileVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String origName;
    private Long sizeBytes;
    private String uploadedBy;
    private String createdAt;
    private Integer shareCount;
}
