package egovframework.let.qm.label.domain.model;

import java.io.Serializable;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 제품 라벨(표시사항)에서 주고받는 값 VO 클래스 (송연 LabelDTO).
 * 화면 하나의 것이 아니라 라벨출력·생산확정(🏷️ 라벨)·라벨등록이 함께 쓴다.
 * 라벨 버전 · 라벨 양식 · 분리배출마크 · 회사 고정정보 · 배합표 한 줄을 한 클래스에 모았다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Schema(description = "제품 라벨")
@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LabelVO implements Serializable {

    private static final long serialVersionUID = 1L;

    // 라벨 버전(product_label_versions)
    private Long id;
    private String productCode;
    private String versionLabel;
    private String note;
    @Schema(description = "1 = 사용중(실제로 인쇄되는 버전)")
    private Integer isCurrent;
    private String createdAt;
    private String createdBy;
    private String updatedAt;
    private String updatedBy;

    // 라벨 한 장을 이루는 항목(송연 label.py LABEL_FIELDS)
    private String foodType;
    private String netWeight;
    @Schema(description = "원재료명 및 함량(굵게·크기 서식이 든 HTML)")
    private String ingredientsText;
    private String allergens;
    private String manufactureReportNo;
    private String packagingMaterial;
    private Integer shelfLifeMonths;
    @Schema(description = "소비기한 단위(년·월·일)")
    private String shelfLifeUnit;
    private String storage;

    // 모양(양식·크기·분리배출마크)과 양식에만 있는 항목. DB 에는 JSON 글자로 들어 있고, 안의 키는 송연 그대로(snake_case)다.
    private transient Map<String, Object> layout;
    private transient Map<String, Object> extra;
    @JsonIgnore
    private String layoutJson;
    @JsonIgnore
    private String extraJson;

    // 라벨 양식(label_templates) · 분리배출마크(label_marks)
    private String name;
    private String size;
    private String dataUrl;
    private Double widthMm;

    // 회사 고정정보(label_company_info)
    private String returnExchangeLocation;
    private String customerServicePhone;
    private String businessName;
    private String businessAddress;
    private String noticeText;

    // 배합표 한 줄(bom)
    private String materialCode;
    private String materialName;
    @Schema(description = "배합비(0.05 = 5%)")
    private Double ratioPercent;
}
