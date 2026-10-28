package egovframework.let.co.workflow.form.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "기안양식 사용자 선택 항목")
@Getter
@Setter
public class DraftingWorkUserOptionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "사용자 ID")
    private Long userId;
    @Schema(description = "로그인 ID")
    private Long loginId;
    @Schema(description = "사용자명")
    private String userNm;
    @Schema(description = "부서명")
    private String departmentNm;
    @Schema(description = "프로필 이미지 경로")
    private String profileImage;
    @Schema(description = "직급명")
    private String levelNm;
}