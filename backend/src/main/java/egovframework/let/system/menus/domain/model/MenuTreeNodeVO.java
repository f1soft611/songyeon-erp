package egovframework.let.system.menus.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 사용자 기준 모듈-메뉴 트리 노드를 표현하는 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "모듈-메뉴 트리 노드 모델")
@Getter
@Setter
public class MenuTreeNodeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "메뉴 ID (모듈 루트 노드는 모듈 ID)")
    private Long menuId;

    @Schema(description = "상위 메뉴 ID (모듈 루트 노드는 null)")
    private Long parentMenuId;

    @Schema(description = "메뉴명")
    private String name;

    @Schema(description = "메뉴설명")
    private String description;

    @Schema(description = "아이콘명")
    private String icon;

    @Schema(description = "라우팅 경로")
    private String path;

    @Schema(description = "권한 정보 (자식이 없는 리프 메뉴만 포함)")
    private MenuPermissionVO permissions;

    @Schema(description = "하위 메뉴 목록")
    private List<MenuTreeNodeVO> children = new ArrayList<>();
}
