package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "기안양식 정보 모델")
@Getter
@Setter
public class DraftingWorkVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "기안양식 ID")
    private Long draftingWorkCategoryId;
    @Schema(description = "테넌트 ID")
    private Long tenantId;
    @Schema(description = "기안양식 코드")
    private String cataTypeCode;
    @Schema(description = "기안양식명")
    private String codeName;
    @Schema(description = "분류 공통코드 항목 ID")
    private Long categoryItemId;
    @Schema(description = "분류명")
    private String categoryName;
    @Schema(description = "등록주기 공통코드 항목 ID")
    private Long regTermId;
    @Schema(description = "등록주기명")
    private String regTerm;
    @Schema(description = "사용 여부")
    private String useAt;
    @Schema(description = "검토자 로그인 ID")
    private Long reviewerId;
    @Schema(description = "검토자명")
    private String reviewerName;
    @Schema(description = "승인자 로그인 ID")
    private Long approverId;
    @Schema(description = "승인자명")
    private String approverName;
    @Schema(description = "담당자 요약")
    private String assigneeSummary;
    @Schema(description = "담당자 사용자 ID 목록")
    private List<String> assigneeIds = new ArrayList<String>();
    @Schema(description = "등록자명")
    private String createdByName;
    @Schema(description = "등록일시", example = "2026-10-02 09:30")
    private String createdAt;
    @Schema(description = "템플릿 문서 존재 여부")
    private Boolean hasDocument;
}