package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 라벨 항목 VO 클래스 (예: 유통전문판매원)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "라벨 항목 VO 클래스 (예: 유통전문판매원)")
@Getter
@Setter
public class LabelFieldVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private String createdAt;
}
