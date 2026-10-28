package egovframework.let.co.master.partnermaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 거래처 분류 한 가지(공통코드 CUSTOMER_CATEGORY 항목, 2026-10-23)
 * @author SONGYEON ERP
 * @since 2026.10.23
 * @version 1.0
 */
@Schema(description = "거래처 분류(공통코드 CUSTOMER_CATEGORY)")
@Getter
@Setter
public class ClientTypeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "분류 코드(clients.client_type 에 저장, 예: 001)")
    private String code;

    @Schema(description = "분류 이름(예: 매입거래처)")
    private String name;
}
