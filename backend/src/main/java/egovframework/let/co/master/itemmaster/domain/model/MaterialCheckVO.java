package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 원재료명 확인 결과 한 줄
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료명 확인 결과 한 줄")
@Getter
@Setter
public class MaterialCheckVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "입력한 이름")
    private String input;

    @Schema(description = "등록된 원재료명과 정확히 같은지")
    private boolean exact;

    @Schema(description = "비슷한 원재료명 (최대 4개)")
    private List<String> suggestions;
}
