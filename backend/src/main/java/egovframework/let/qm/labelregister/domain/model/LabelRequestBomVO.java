package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 표시사항 요청의 레시피 배합표 한 줄 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "표시사항 요청의 레시피 배합표 한 줄 VO 클래스")
@Getter
@Setter
public class LabelRequestBomVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String materialName;
    private Double ratioPercent;
}
