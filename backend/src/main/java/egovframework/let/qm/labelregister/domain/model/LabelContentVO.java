package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 라벨 내용 저장 요청 VO 클래스 (제품 버전·표시사항 요청 공통). layout·extra 안의 키는 송연 그대로(format_id 등)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "라벨 내용 저장 요청 VO 클래스 (제품 버전·표시사항 요청 공통). layout·extra 안의 키는 송연 그대로(format_id 등)")
@Getter
@Setter
public class LabelContentVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long versionId;
    private String foodType;
    private String netWeight;
    private String ingredientsText;
    private String allergens;
    private String manufactureReportNo;
    private String packagingMaterial;
    private Object shelfLifeMonths;
    private String shelfLifeUnit;
    private String storage;
    private transient Map<String, Object> extra;
    private transient Map<String, Object> layout;
    private String productName;
    private String note;
    private String status;
}
