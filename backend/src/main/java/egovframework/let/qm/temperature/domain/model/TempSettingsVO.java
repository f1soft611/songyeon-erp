package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 타파쿨로365 연동 여부 VO 클래스 (키 앞뒤 몇 글자만)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "타파쿨로365 연동 여부 VO 클래스 (키 앞뒤 몇 글자만)")
@Getter
@Setter
public class TempSettingsVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private boolean configured;
    private String keyPreview;
}
