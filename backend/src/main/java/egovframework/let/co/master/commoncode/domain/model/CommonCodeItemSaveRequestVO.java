package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 상세 저장 요청")
@Getter
@Setter
public class CommonCodeItemSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "상세 코드")
    private String itemCode;

    @Schema(description = "상세 코드명")
    private String itemNm;

    @Schema(description = "상세 코드 설명")
    private String itemDc;

    @Schema(description = "상위 상세 코드 ID")
    private Long parentItemId;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;
}
