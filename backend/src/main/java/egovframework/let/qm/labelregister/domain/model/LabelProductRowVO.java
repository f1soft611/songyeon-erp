package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 제품 목록 한 줄 VO 클래스 (송연 /api/label-register/products). labelState: done 등록됨 · partial 작성중 · none 미등록
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "제품 목록 한 줄 VO 클래스 (송연 /api/label-register/products). labelState: done 등록됨 · partial 작성중 · none 미등록")
@Getter
@Setter
public class LabelProductRowVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String spec;
    private String foodType;
    private String netWeight;
    private String ingredientsText;
    private String manufactureReportNo;
    private String currentVersion;
    private Integer versionCount;
    private String lastEdited;
    private String labelState;
}
