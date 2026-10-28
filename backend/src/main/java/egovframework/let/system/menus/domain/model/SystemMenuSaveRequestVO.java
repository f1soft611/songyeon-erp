package egovframework.let.system.menus.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 메뉴 등록/수정 요청을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "메뉴 저장 요청 모델")
@Getter
@Setter
public class SystemMenuSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "모듈 ID")
    private Long moduleId;

    @Schema(description = "상위 메뉴 ID")
    private Long parentMenuId;

    @Schema(description = "메뉴 코드")
    private String menuCode;

    @Schema(description = "메뉴명")
    private String menuNm;

    @Schema(description = "메뉴설명")
    private String menuDc;

    @Schema(description = "메뉴 URL")
    private String menuUrl;

    @Schema(description = "아이콘명")
    private String iconNm;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;
}
