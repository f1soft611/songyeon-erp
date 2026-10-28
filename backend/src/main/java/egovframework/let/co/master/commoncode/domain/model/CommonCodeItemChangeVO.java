package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 상세 변경 행")
@Getter
@Setter
public class CommonCodeItemChangeVO extends CommonCodeItemSaveRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "로컬 행 ID 또는 서버 ID")
    private String id;

    @Schema(description = "그룹 ID")
    private String groupId;
}
