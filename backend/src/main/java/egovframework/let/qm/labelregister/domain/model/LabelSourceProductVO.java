package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 다른 제품 라벨 가져오기 후보 VO 클래스 (사용중 버전 기준)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "다른 제품 라벨 가져오기 후보 VO 클래스 (사용중 버전 기준)")
@Getter
@Setter
public class LabelSourceProductVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String code;
    private String name;
    private String spec;
    private Long versionId;
    private String versionLabel;
}
