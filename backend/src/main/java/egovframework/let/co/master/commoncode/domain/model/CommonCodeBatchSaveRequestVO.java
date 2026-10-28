package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 일괄 저장 요청")
@Getter
@Setter
public class CommonCodeBatchSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "그룹 변경 세트")
    private CommonCodeBatchChangeSetVO groups = new CommonCodeBatchChangeSetVO();

    @Schema(description = "상세 변경 세트")
    private CommonCodeBatchItemChangeSetVO items = new CommonCodeBatchItemChangeSetVO();
}
