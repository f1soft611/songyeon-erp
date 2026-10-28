package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 기본정보 저장 요청
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "기본정보 저장 요청")
@Getter
@Setter
public class ProductInfoSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품명 (필수)")
    private String name;

    @Schema(description = "보관방법")
    private String storage;

    @Schema(description = "업체명 (거래처BOM 이름만). 2026-10-23 부터 저장에는 쓰지 않는다(clientCode 를 쓴다)")
    private String clientName;

    @Schema(description = "거래처코드(2026-10-23, 화면이 목록에서 고른 값). 비우면 거래처 없음")
    private String clientCode;
}
