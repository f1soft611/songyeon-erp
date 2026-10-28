package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 폴더 비밀번호 요청 VO 클래스 (password: 새 비밀번호 또는 열 비밀번호, current: 지금 비밀번호)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "폴더 비밀번호 요청 VO 클래스 (password: 새 비밀번호 또는 열 비밀번호, current: 지금 비밀번호)")
@Getter
@Setter
public class DocLockRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String password;
    private String current;
}
