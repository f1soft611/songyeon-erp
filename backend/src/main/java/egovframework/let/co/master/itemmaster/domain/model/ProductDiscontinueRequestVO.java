package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 사용안함/되돌리기 요청
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "사용안함/되돌리기 요청")
@Getter
@Setter
public class ProductDiscontinueRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "true = 사용안함, false = 되돌리기")
    private Boolean discontinued;

    @Schema(description = "메모")
    private String note;
}
