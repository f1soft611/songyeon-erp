package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 표시사항 요청 VO 클래스 (확정 전, 제품이 없는 건). fillState: done 다 적음 · partial 적는 중 · none 아직
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "표시사항 요청 VO 클래스 (확정 전, 제품이 없는 건). fillState: done 다 적음 · partial 적는 중 · none 아직")
@Getter
@Setter
public class LabelRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long handoffId;
    private String status;
    private String movedProductCode;
    private String note;
    private String productName;
    private String foodType;
    private String netWeight;
    private String ingredientsText;
    private String allergens;
    private String manufactureReportNo;
    private String packagingMaterial;
    private Integer shelfLifeMonths;
    private String shelfLifeUnit;
    private String storage;
    @JsonIgnore
    private String layoutJson;
    @JsonIgnore
    private String extraJson;
    private transient Map<String, Object> layout;
    private transient Map<String, Object> extra;
    private String updatedAt;
    private String updatedBy;
    private Long versionId;
    private String versionLabel;
    private String requestedByName;
    private String requestedAt;
    private Long draftId;
    private String recipeName;
    private String spec;
    private String clientName;
    private String remark;
    private String fillState;
    private transient List<LabelRequestBomVO> bom;
}
