package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 타파쿨로365 채널 VO 클래스 (등록 창에서 고르는 장치·채널과 지금 값)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "타파쿨로365 채널 VO 클래스 (등록 창에서 고르는 장치·채널과 지금 값)")
@Getter
@Setter
public class TempChannelVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String channelKey;
    private String deviceName;
    private String chName;
    private String chUnit;
    private Object chValue;
}
