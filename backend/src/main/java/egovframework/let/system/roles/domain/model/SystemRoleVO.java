package egovframework.let.system.roles.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할 정보 응답을 위한 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "역할 정보 모델")
@Getter
@Setter
public class SystemRoleVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "역할 ID")
    private Long roleId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "역할 코드")
    private String roleCode;

    @Schema(description = "역할명")
    private String roleNm;

    @Schema(description = "역할 설명")
    private String roleDc;

    @Schema(description = "사용 여부")
    private String useAt;

    @Schema(description = "시스템 기본 역할 여부")
    private String isSystemRole;

    @Schema(description = "역할에 연결된 사용자 수")
    private Integer userCount;

    @Schema(description = "등록일시")
    private Date createdAt;

    @Schema(description = "수정일시")
    private Date updatedAt;
}
