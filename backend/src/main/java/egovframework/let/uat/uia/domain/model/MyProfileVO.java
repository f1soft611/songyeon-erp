package egovframework.let.uat.uia.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MyProfileVO {
    private String userId;
    /** S_ERP 와 같이 tb_user.user_id(전자결재가 로그인 사용자를 찾는 값, 2026-10-22) */
    private Long employeeId;
    private String name;
    private String email;
    private String departmentName;
    private String levelName;
    private String profileImage;
    private String stampImage;
}
