package egovframework.let.pu.receiving.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 입고(반품) 등록 결과 VO 클래스 ({registered, rows:[{id, materialCode, materialName, barcode, key}]})
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Schema(description = "입고·반품 등록 결과")
@Getter
@Setter
public class ReceivingBulkResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int registered;
    private List<ReceivingVO> rows;
    @Schema(description = "줄마다 화면이 보낸 표시(rows 와 같은 차례)")
    private List<String> keys;
}
