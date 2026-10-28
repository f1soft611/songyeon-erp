package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "기안양식 조회 조건 모델")
@Getter
@Setter
public class DraftingWorkSearchConditionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "기안양식 ID")
    private Long workId;
    @Schema(description = "양식 코드 또는 양식명 통합 검색어")
    private String keyword;
    @Schema(description = "분류 공통코드 항목 ID")
    private Long categoryItemId;
    @Schema(description = "등록주기 공통코드 항목 ID")
    private Long regTermId;
    @Schema(description = "사용 여부 (Y/N)")
    private String useAt;
}