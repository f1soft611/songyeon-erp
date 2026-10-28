package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 신규 원재료 등록 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "신규 원재료 등록 요청")
@Getter
@Setter
public class MaterialCreateRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료명(필수)")
    private String name;

    // 등록자 사번(2026-10-23): 화면에서 받지 않고 컨트롤러가 로그인 사원으로 채운다
    @JsonIgnore
    private String regUserId;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "단가(원, 숫자 글자)")
    private String unitPrice;

    @Schema(description = "이름·규격이 같은 원재료가 있어도 저장(화면에서 확인을 받은 경우 true)")
    private Boolean allowDuplicate;
}
