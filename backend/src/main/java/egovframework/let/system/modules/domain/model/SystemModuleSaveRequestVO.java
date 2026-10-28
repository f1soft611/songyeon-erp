package egovframework.let.system.modules.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 모듈 등록/수정 요청을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "모듈 저장 요청 모델")
@Getter
@Setter
public class SystemModuleSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "모듈 코드")
    private String moduleCode;

    @Schema(description = "모듈명")
    private String moduleNm;

    @Schema(description = "아이콘명")
    private String iconNm;

    @Schema(description = "모듈 루트 경로")
    private String moduleUrl;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;
}
