package egovframework.let.qm.labelregister.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 라벨등록 버전 만들기·이름 바꾸기 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "버전 만들기·이름 바꾸기 요청 VO 클래스")
@Getter
@Setter
public class LabelVersionRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long fromVersionId;
    private String versionLabel;
    private String note;
}
