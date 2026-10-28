package egovframework.let.sl.register.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 고른 출하확정 건을 판매로 넣는 요청 VO 클래스. 금액은 받지 않는다(서버가 지금 출하 기록에서 다시 센다).
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "선택 항목 판매등록 요청")
@Getter
@Setter
public class SalesPullRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "고른 출하 건(sourceType·sourceId)")
    private List<ShippableSaleVO> items;
}
