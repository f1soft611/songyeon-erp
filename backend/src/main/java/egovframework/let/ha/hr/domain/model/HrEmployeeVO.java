package egovframework.let.ha.hr.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 인사관리 사원 한 줄 VO 클래스 (송연 employees 의 인사정보 + 아이디. 비밀번호·권한·주민번호 잠긴 값은 내보내지 않는다)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 인사관리 사원 한 줄 VO 클래스")
@Getter
@Setter
public class HrEmployeeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String name;
    private String department;
    private String position;
    private String phone;
    private String birthDate;
    private String address;
    private String hireDate;
    private String resignDate;
    private String memo;
    private String username;
    private String createdAt;
    private boolean hasLogin;
    private boolean hasResidentNo;
    private String residentNoMasked;
    /** 송연 원본의 관리자 표시(보여주기만) */
    private boolean admin;
    /** 송연 원본의 화면 권한 수(permissions JSON 배열 길이. 보여주기만) */
    private int permissionCount;
}
