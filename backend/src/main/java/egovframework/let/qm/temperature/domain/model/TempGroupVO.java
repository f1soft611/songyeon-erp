package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 그룹 VO 클래스 (송연 temp_groups). refreshIntervalSec 0 = 자동새로고침 끔
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "그룹 VO 클래스 (송연 temp_groups). refreshIntervalSec 0 = 자동새로고침 끔")
@Getter
@Setter
public class TempGroupVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private Integer refreshIntervalSec;
}
