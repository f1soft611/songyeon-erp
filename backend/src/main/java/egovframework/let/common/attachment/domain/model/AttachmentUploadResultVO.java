package egovframework.let.common.attachment.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 첨부 올리기 결과 VO 클래스 ({saved, errors})
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "첨부 올리기 결과")
@Getter
@Setter
public class AttachmentUploadResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "올린 파일 수")
    private int saved;
    @Schema(description = "올리지 못한 파일과 까닭")
    private List<String> errors;
}
