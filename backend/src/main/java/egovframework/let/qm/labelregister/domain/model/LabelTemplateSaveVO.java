package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 라벨 양식 저장 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "라벨 양식 저장 요청 VO 클래스")
@Getter
@Setter
public class LabelTemplateSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private String size;
    private transient Map<String, Object> layout;
}
