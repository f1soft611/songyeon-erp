package egovframework.let.sa.shipment.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 영업관리 - 출하등록 로트 선택 결과 VO 클래스. 품목명(규격)과 같은 제품이 없으면 productCode 가 null
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "로트 목록")
@Getter
@Setter
public class ProductLotListVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "제품코드(일치하는 제품이 없으면 null)")
    private String productCode;

    @Schema(description = "로트")
    private List<ProductLotVO> lots;
}
