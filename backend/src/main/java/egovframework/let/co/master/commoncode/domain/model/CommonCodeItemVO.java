package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 상세 정보")
@Getter
@Setter
public class CommonCodeItemVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "공통코드 상세 ID")
    private Long commonCodeItemId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "그룹 ID")
    private Long groupId;

    @Schema(description = "상세 코드")
    private String itemCode;

    @Schema(description = "상세 코드명")
    private String itemNm;

    @Schema(description = "상세 코드 설명")
    private String itemDc;

    @Schema(description = "상위 상세 코드 ID")
    private Long parentItemId;

    @Schema(description = "상위 상세 코드명")
    private String parentItemNm;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;

    @Schema(description = "생성 일시")
    private Date createdAt;

    @Schema(description = "수정 일시")
    private Date updatedAt;
}
