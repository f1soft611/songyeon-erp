package egovframework.let.system.serversettings.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 서버관리 VO 클래스 (송연 external_api_settings)
 * 키 자체는 내려보내지 않는다 — 등록 여부와 앞뒤 몇 글자만.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "서버관리(외부 API 설정) 모델")
@Getter
@Setter
public class ServerSettingVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "서비스 키(radionode·popbill 등)")
    private String serviceKey;

    @Schema(description = "서비스 이름")
    private String serviceName;

    @JsonIgnore
    private String apiKey;

    @JsonIgnore
    private String apiSecret;

    @Schema(description = "주소(엔드포인트)")
    private String baseUrl;

    @Schema(description = "최근수정")
    private String updatedAt;

    @Schema(description = "키 등록 여부")
    private Boolean configured;

    @Schema(description = "키 앞뒤 몇 글자")
    private String keyPreview;
}
