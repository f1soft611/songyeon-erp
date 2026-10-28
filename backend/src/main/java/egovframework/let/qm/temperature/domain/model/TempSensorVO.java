package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 센서 VO 클래스 (송연 temp_sensors). sensorId = 장치MAC|센서MAC|채널번호
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "센서 VO 클래스 (송연 temp_sensors). sensorId = 장치MAC|센서MAC|채널번호")
@Getter
@Setter
public class TempSensorVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private String sensorId;
    private Double minTemp;
    private Double maxTemp;
    private String groupName;
    private String createdAt;
}
