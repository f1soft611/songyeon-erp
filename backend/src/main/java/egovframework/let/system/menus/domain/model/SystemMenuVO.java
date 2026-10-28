package egovframework.let.system.menus.domain.model;

import java.io.Serializable;
import java.util.Date;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 메뉴 정보 응답을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "메뉴 정보 모델")
@Getter
@Setter
public class SystemMenuVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "메뉴 ID")
    private Long menuId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "모듈 ID")
    private Long moduleId;

    @Schema(description = "모듈명")
    private String moduleNm;

    @Schema(description = "상위 메뉴 ID")
    private Long parentMenuId;

    @Schema(description = "상위 메뉴명")
    private String parentMenuNm;

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
    private int sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;

    @Schema(description = "하위 메뉴 보유 여부")
    private boolean hasChildren;

    @Schema(description = "활성 메뉴 버튼 권한 코드 목록")
    private List<String> permissionCodes;

    @Schema(description = "등록일시")
    private Date createdAt;

    @Schema(description = "수정일시")
    private Date updatedAt;
}
