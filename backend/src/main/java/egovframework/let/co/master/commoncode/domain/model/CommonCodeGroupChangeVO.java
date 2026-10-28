package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 그룹 변경 행")
@Getter
@Setter
public class CommonCodeGroupChangeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "로컬 행 ID 또는 서버 ID")
    private String id;

    @Schema(description = "그룹 코드")
    private String groupCode;

    @Schema(description = "그룹명")
    private String groupNm;

    @Schema(description = "그룹 설명")
    private String groupDc;

    @Schema(description = "상위 그룹 ID(로컬 임시 ID 또는 서버 ID)")
    private String parentGroupId;

    @Schema(description = "정렬 순서")
    private Integer sortOrder;

    @Schema(description = "사용 여부")
    private String useAt;
}
