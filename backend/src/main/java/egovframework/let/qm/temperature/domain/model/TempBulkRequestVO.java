package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 센서 일괄등록 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "센서 일괄등록 요청 VO 클래스")
@Getter
@Setter
public class TempBulkRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private List<TempSensorVO> items;
}
