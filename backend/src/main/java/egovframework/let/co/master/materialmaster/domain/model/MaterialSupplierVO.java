package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료 납품업체 VO 클래스 (송연 material_supplier). 납품업체 자동완성 목록에도 쓴다
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료 납품업체 모델")
@Getter
@Setter
public class MaterialSupplierVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료코드")
    private String materialCode;

    @Schema(description = "업체코드(clients.id). 송연 원본이 넣은 옛 줄은 비어 있을 수 있음")
    private Long clientId;

    @Schema(description = "거래처코드(clients.client_code, 2026-10-23). 원재료에는 이 코드를 저장한다")
    private String clientCode;

    @Schema(description = "업체명(업체코드가 있으면 거래처 표의 현재 이름)")
    private String clientName;
}
