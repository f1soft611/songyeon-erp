package egovframework.let.qm.inspection.productinspection.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 제품검사 > 제품별 기준 목록 한 줄 VO 클래스 (송연 /api/qdoc/pspec/products 의 rows).
 * foodType 은 공통코드 FOOD_TYPE 코드, foodTypeNm 은 공통코드 이름(코드가 아니면 저장된 글자)
 * @author SONGYEON ERP
 * @since 2026.11.06
 * @version 1.0
 */
@Schema(description = "제품별 기준 목록 한 줄 VO 클래스 (송연 /api/qdoc/pspec/products)")
@Getter
@Setter
public class ProductSpecRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String spec;
    private String foodType;
    private String foodTypeNm;
}
