package egovframework.let.pu.substitution.domain.model;

import java.io.Serializable;

import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재료 치환등록 쪽지(production_material_substitution 한 행) · 배합표 한 줄 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Getter
@Setter
public class SubstitutionRecordVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long scheduleId;
    private String fromMaterialCode;
    private String fromMaterialName;
    private String toMaterialCode;
    private String toMaterialName;
    private String reason;
    private String createdAt;
    private String createdBy;

    // 배합표 한 줄(bom): 원재료 코드 · 지금 이름 · 비율(0~1)
    private String materialCode;
    private String materialName;
    private Double ratio;
}
