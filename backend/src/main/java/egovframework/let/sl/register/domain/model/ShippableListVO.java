package egovframework.let.sl.register.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 판매관리 - 판매로 끌어올 출하확정 목록 VO 클래스 ({rows, pendingCount})
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@Schema(description = "판매로 끌어올 출하확정 목록")
@Getter
@Setter
public class ShippableListVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<ShippableSaleVO> rows;

    @Schema(description = "아직 판매로 넣지 않은 건수")
    private Integer pendingCount;
}
