package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 거래처 고르기 목록 한 줄(2026-10-23): 화면은 이름을 보여 주고 거래처코드를 저장한다
 * (제품등록 · 제품마스터 창 · 견적)
 * @author SONGYEON ERP
 * @since 2026.10.23
 * @version 1.0
 */
@Schema(description = "거래처 고르기 목록 한 줄(사용 중 거래처)")
@Getter
@Setter
public class ClientOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "거래처코드(6자리)")
    private String clientCode;

    @Schema(description = "거래처명")
    private String name;
}
