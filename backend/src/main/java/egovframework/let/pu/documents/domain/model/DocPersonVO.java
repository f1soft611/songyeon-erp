package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 공유받을 사람 VO 클래스 (송연 /api/document-shares/people)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "공유받을 사람 VO 클래스 (송연 /api/document-shares/people)")
@Getter
@Setter
public class DocPersonVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String name;
    private String department;
}
