package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 센서 현재값 VO 클래스 (송연 /api/temp/readings 한 줄)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "센서 현재값 VO 클래스 (송연 /api/temp/readings 한 줄)")
@Getter
@Setter
public class TempReadingVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String name;
    private Double minTemp;
    private Double maxTemp;
    private String groupName;
    private boolean ok;
    private String error;
    private Double value;
    private Object battery;
    private String lastUpdate;
    private String sensorModel;
    private String deviceName;
    private String chName;
    private String chUnit;
    private boolean outOfRange;
}
