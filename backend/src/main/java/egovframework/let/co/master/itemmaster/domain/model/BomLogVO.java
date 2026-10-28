package egovframework.let.co.master.itemmaster.domain.model;

import java.io.Serializable;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 제품BOM: 배합비 변경로그 한 줄 (바뀌기 전·후 BOM 한 벌)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "배합비 변경로그 한 줄 (바뀌기 전·후 BOM 한 벌)")
@Getter
@Setter
public class BomLogVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "로그 ID")
    private Long logId;

    @Schema(description = "바꾼 일시")
    private String changedAt;

    @JsonIgnore
    private String oldBomJson;

    @JsonIgnore
    private String newBomJson;

    @Schema(description = "바뀌기 전 BOM")
    private List<BomLineVO> oldBom;

    @Schema(description = "바뀐 뒤 BOM")
    private List<BomLineVO> newBom;
}
