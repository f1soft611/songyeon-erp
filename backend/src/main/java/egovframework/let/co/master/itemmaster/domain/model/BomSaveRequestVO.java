package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 배합비 저장 요청 (통째로 다시 적음)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "배합비 저장 요청 (통째로 다시 적음)")
@Getter
@Setter
public class BomSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "배합비 줄")
    private List<BomLineInputVO> bom;
}
