package egovframework.let.ha.hr.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 로그인계정 저장 요청 VO 클래스 ({username, password}. 비밀번호는 바꿀 때만)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 로그인계정 저장 요청 VO 클래스")
@Getter
@Setter
public class HrAccountSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String username;
    private String password;
}
