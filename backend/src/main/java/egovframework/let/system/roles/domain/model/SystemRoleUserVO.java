package egovframework.let.system.roles.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할별 사용자 매핑 정보를 담는 VO 클래스
 * @author S-ERP
 * @since 2026.09.03
 * @version 1.0
 */
@Schema(description = "역할 사용자 매핑 모델")
@Getter
@Setter
public class SystemRoleUserVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 ID")
    private Long userId;

    @Schema(description = "로그인 ID")
    private Long loginId;

    // 송연: 계정 표 login_code = 사번(employees.id). 화면 '로그인 ID' 칸에 보여 준다(2026-10-21)
    @Schema(description = "로그인 코드(사번)")
    private String loginCode;

    @Schema(description = "사용자명")
    private String userNm;

    @Schema(description = "부서명")
    private String departmentNm;

    @Schema(description = "현재 역할 매핑 여부")
    private Boolean assigned = false;

    @Schema(description = "이메일 주소")
    private String emailAddr;

    @Schema(description = "최근 로그인 시각")
    private Date lastLoginAt;
}
