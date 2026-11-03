package egovframework.let.uat.uia.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MyProfileVO {
    private String userId;
    /** 사번(2026-11-03). 전자결재가 결재선의 사번과 비교해 로그인 사용자를 찾는다 */
    private String employeeId;
    private String name;
    private String email;
    private String departmentName;
    private String levelName;
    private String profileImage;
    private String stampImage;
}
