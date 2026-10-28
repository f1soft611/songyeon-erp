package egovframework.let.rd.recipe.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 상품개발 - 레시피 작성 배합표 저장 한 줄 VO 클래스. ratioPercent 는 화면에서 계산한 퍼센트(18.69), unitPrice 를 비우면 원재료단가
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "배합표 저장 한 줄 VO 클래스. ratioPercent 는 화면에서 계산한 퍼센트(18.69), unitPrice 를 비우면 원재료단가")
@Getter
@Setter
public class RecipeBomInputVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialName;
    private String materialCode;
    private Object weight;
    private Object ratioPercent;
    private Object unitPrice;
}
