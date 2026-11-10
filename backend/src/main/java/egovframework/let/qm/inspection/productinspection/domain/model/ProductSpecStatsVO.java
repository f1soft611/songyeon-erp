package egovframework.let.qm.inspection.productinspection.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 제품검사 > 제품별 기준 요약 VO 클래스 (송연 /api/qdoc/pspec/products 의 stats). 검색과 관계없이 사용 중인 제품 전체
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
@Schema(description = "제품별 기준 요약 VO 클래스: 제품 수 · 식품유형 정한 수 · 규격 넣은 수")
@Getter
@Setter
public class ProductSpecStatsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int total;
    private int typed;
    private int withSpec;
}
