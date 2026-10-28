package egovframework.let.uss.auth.service;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 정보 VO 클래스
 * @author S-ERP
 * @since 2024.01.01
 * @version 1.0
 */
@Schema(description = "역할 정보 VO")
@Getter
@Setter
public class RoleInfoVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "역할 ID")
    private Long roleId;

    @Schema(description = "역할 코드")
    private String roleCode = "";

    @Schema(description = "역할명")
    private String roleNm = "";

    @Schema(description = "역할 설명")
    private String roleDc = "";

    @Schema(description = "역할 레벨")
    private Integer roleLevel;

    @Schema(description = "테넌트 범위 여부")
    private String tenantScoped = "Y";

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "테넌트 코드")
    private String tenantCode = "";

    @Schema(description = "사용여부")
    private String useAt = "Y";

    @Schema(description = "시스템 권한 여부(Y/N)")
    private String systemRoleYn = "N";

    @Schema(description = "시스템 권한 여부")
    private Boolean systemRole = Boolean.FALSE;

    @Schema(description = "최초등록일시")
    private Date frstRegistPnttm;

    @Schema(description = "최초등록자ID")
    private String frstRegisterId = "";

    @Schema(description = "최종수정일시")
    private Date lastUpdtPnttm;

    @Schema(description = "최종수정자ID")
    private String lastUpdusrId = "";

    @Schema(description = "검색 필드")
    private String searchField = "";

    @Schema(description = "검색어")
    private String searchKeyword = "";

    @Schema(description = "페이지 인덱스")
    private int pageIndex = 1;

    @Schema(description = "페이지 크기")
    private int pageSize = 10;

    @Schema(description = "첫 레코드 인덱스")
    private int firstIndex = 0;

    @Schema(description = "마지막 레코드 인덱스")
    private int lastIndex = 0;

    @Schema(description = "레코드 개수")
    private int recordCountPerPage = 10;

    /**
     * 역할 상태 변경 정책을 검증한다.
     * @param target 변경 대상 역할
     */
    public static void validateUpdatePolicy(RoleInfoVO target) {
        if (target == null) {
            throw new IllegalArgumentException("role target is required");
        }

        if ("PLATFORM_ADMIN".equalsIgnoreCase(target.getRoleCode())
                && "N".equalsIgnoreCase(target.getUseAt())) {
            throw new IllegalArgumentException("PLATFORM_ADMIN cannot be deactivated");
        }
    }

}