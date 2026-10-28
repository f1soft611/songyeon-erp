package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 일괄 저장 결과")
@Getter
@Setter
public class CommonCodeBatchSaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "처리된 그룹 목록")
    private List<CommonCodeGroupVO> groups = new ArrayList<>();

    @Schema(description = "처리된 상세 목록")
    private List<CommonCodeItemVO> items = new ArrayList<>();
}
