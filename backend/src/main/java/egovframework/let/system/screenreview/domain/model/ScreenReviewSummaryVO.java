package egovframework.let.system.screenreview.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 화면검수 관리 목록 VO (화면 한 개 = 한 줄, 환경설정 > 화면검수 관리)
 * @author SONGYEON ERP
 * @since 2026.11.05
 * @version 1.0
 */
@Schema(description = "화면검수 관리 목록 한 줄")
@Getter
@Setter
public class ScreenReviewSummaryVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "모듈 코드")
    private String moduleCode;

    @Schema(description = "모듈 이름")
    private String moduleName;

    @Schema(description = "메뉴 번호")
    private Long menuId;

    @Schema(description = "화면ID(menu_code)")
    private String menuCode;

    @Schema(description = "화면 이름")
    private String menuName;

    @Schema(description = "메뉴구분: 중분류(부모 메뉴) 이름")
    private String groupName;

    @Schema(description = "개발담당")
    private String developerName;

    @Schema(description = "마지막 검수일(YYYY-MM-DD)")
    private String reviewDate;

    @Schema(description = "현황 상태(현황 줄이 없으면 null)")
    private String reviewStatus;

    @Schema(description = "마지막 이력의 새 상태(이력이 없으면 null)")
    private String lastToStatus;

    @Schema(description = "마지막 이력 의견")
    private String lastComment;

    @Schema(description = "표시 상태: COMPLETED 검수완료, IN_PROGRESS 검수진행중, CHANGE_REQUESTED 수정요청, NOT_STARTED 미진행")
    private String displayStatus;
}
