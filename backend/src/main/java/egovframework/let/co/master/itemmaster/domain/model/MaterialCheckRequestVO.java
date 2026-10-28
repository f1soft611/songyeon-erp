package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 원재료명 확인 요청
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료명 확인 요청")
@Getter
@Setter
public class MaterialCheckRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "확인할 원재료명들")
    private List<String> names;
}
