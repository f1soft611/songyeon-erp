package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 로그인한 사원(송연 session 의 employee_id·name·department·is_admin 대신 employees 를 읽는다)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "로그인한 사원(송연 session 의 employee_id·name·department·is_admin 대신 employees 를 읽는다)")
@Getter
@Setter
public class DocUserVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String name;
    private String department;
    private boolean admin;
}
