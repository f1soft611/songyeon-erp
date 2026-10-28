package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 라벨 마크 넣기 요청 VO 클래스 (그림은 data URL)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "라벨 마크 넣기 요청 VO 클래스 (그림은 data URL)")
@Getter
@Setter
public class LabelMarkSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private String dataUrl;
    private Object widthMm;
}
