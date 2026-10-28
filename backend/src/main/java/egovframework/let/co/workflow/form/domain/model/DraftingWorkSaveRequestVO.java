package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "기안양식 등록/수정 요청 모델")
@Getter
@Setter
public class DraftingWorkSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "기안양식 코드", example = "007")
    private String cataTypeCode;
    @Schema(description = "기안양식명", required = true, example = "정기점검")
    private String codeName;
    @Schema(description = "분류 공통코드 항목 ID", required = true)
    private Long categoryItemId;
    @Schema(description = "등록주기 공통코드 항목 ID", required = true)
    private Long regTermId;
    @Schema(description = "검토자 로그인 ID")
    private Long reviewerId;
    @Schema(description = "승인자 로그인 ID")
    private Long approverId;
    @Schema(description = "담당자 사용자 ID 목록, 생략 또는 null은 빈 목록으로 처리")
    private List<String> assigneeIds = new ArrayList<String>();
    @Schema(description = "사용 여부 (Y/N)", example = "Y")
    private String useAt;
}