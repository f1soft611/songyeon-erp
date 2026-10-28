package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 그룹 정보")
@Getter
@Setter
public class CommonCodeGroupVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "공통코드 그룹 ID")
    private Long commonCodeGroupId;

    @Schema(description = "테넌트 ID")
    private Long tenantId;

    @Schema(description = "그룹 코드")
    private String groupCode;

    @Schema(description = "그룹명")
    private String groupNm;

    @Schema(description = "그룹 설명")
    private String groupDc;

    @Schema(description = "상위 그룹 ID")
    private Long parentGroupId;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;

    @Schema(description = "생성 일시")
    private Date createdAt;

    @Schema(description = "수정 일시")
    private Date updatedAt;
}
