package egovframework.let.sales.order.prodcheck.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 생산가능확인 - 확인 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "생산가능확인 요청")
@Getter
@Setter
public class ProdCheckRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "생산일자(비우면 오늘)")
    private String date;

    @Schema(description = "만들 것")
    private List<ProdCheckLineVO> lines;
}
