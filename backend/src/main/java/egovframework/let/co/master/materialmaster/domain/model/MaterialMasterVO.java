package egovframework.let.co.master.materialmaster.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 원재료BOM·부자재BOM VO 클래스 (송연 materials)
 * 부자재(필름·파우치·박스)도 같은 표에 있고 subCategory 로만 갈린다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "원재료(원재료BOM·부자재BOM) 모델")
@Getter
@Setter
public class MaterialMasterVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "원재료코드")
    private String code;

    @Schema(description = "원재료명")
    private String name;

    @Schema(description = "규격")
    private String spec;

    @Schema(description = "단가(원)")
    private Double unitPrice;

    @Schema(description = "재고")
    private Double stockQty;

    @Schema(description = "예전 한 칸짜리 구매업체(첫 납품업체와 같게 맞춤)")
    private String supplier;

    @Schema(description = "납품업체명(거래처와 조인, 여러 곳이면 '다온, 대영산업')")
    private String supplierName;

    /** 납품업체 거래처코드 배열(조인 결과, 화면 칩을 만들 때만 씀. 2026-10-23 거래처 id → 거래처코드) */
    @JsonIgnore
    private String[] supplierCodes;

    /** 납품업체명 배열(supplierCodes 와 같은 순서) */
    @JsonIgnore
    private String[] supplierNames;

    @Schema(description = "납품업체(여러 곳) — 업체코드·업체명")
    private java.util.List<MaterialSupplierVO> suppliers;

    @Schema(description = "창고")
    private String warehouse;

    @Schema(description = "안전재고")
    private Double safetyStock;

    @Schema(description = "기초발주량")
    private Double baseOrderQty;

    @Schema(description = "알러지유발물질")
    private String allergens;

    @Schema(description = "부자재 분류(필름·파우치·박스), 원재료는 null")
    private String subCategory;
    @Schema(description = "부자재 분류 이름(공통코드 SUB_MATERIAL_CATEGORY, 예: 필름). 2026-10-23 부터 subCategory 는 코드")
    private String subCategoryNm;

    @Schema(description = "입고단위 코드(공통코드 UNIT, 2026-10-23. 예: 001)")
    private String unit;

    @Schema(description = "입고단위 이름(공통코드 UNIT, 예: KG)")
    private String unitNm;

    // 등록자 사번(2026-10-23): 화면에서 받지 않고 서버가 로그인 사원으로 채운다
    @JsonIgnore
    private String regUserId;

    @Schema(description = "등록자 이름(사원 이름, 없으면 사번)")
    private String regUserNm;

    @Schema(description = "등록일시(YYYY-MM-DD HH24:MI:SS)")
    private String regDt;

    @Schema(description = "수정자 이름(사원 이름, 없으면 사번)")
    private String updUserNm;

    @Schema(description = "수정일시(YYYY-MM-DD HH24:MI:SS)")
    private String updDt;

    @Schema(description = "사용여부(Y 사용 / N 사용안함, 2026-10-23)")
    private String useYn;

    @Schema(description = "단위중량(한 봉 kg)")
    private Double unitWeight;

    @Schema(description = "박스 입수량(몇 봉)")
    private Integer boxQty;

    @Schema(description = "마지막 사용일(생산 투입 기록)")
    private String lastUsedDate;

    @Schema(description = "이 부자재를 걸어둔 제품 수(부자재BOM)")
    private Integer usedByCount;
}
