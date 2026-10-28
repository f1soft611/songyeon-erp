package egovframework.let.system.modules.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 모듈 정보 응답을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "모듈 정보 모델")
@Getter
@Setter
public class SystemModuleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "모듈 ID")
    private Long moduleId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "모듈 코드")
    private String moduleCode;

    @Schema(description = "모듈명")
    private String moduleNm;

    @Schema(description = "아이콘명")
    private String iconNm;

    @Schema(description = "모듈 루트 경로")
    private String moduleUrl;

    @Schema(description = "정렬 순서")
    private int sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;

    @Schema(description = "메뉴 보유 개수")
    private int menuCount;

    @Schema(description = "등록일시")
    private Date createdAt;

    @Schema(description = "수정일시")
    private Date updatedAt;
}
