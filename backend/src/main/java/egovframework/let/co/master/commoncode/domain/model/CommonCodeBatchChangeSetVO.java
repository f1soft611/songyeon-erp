package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 그룹 변경 세트")
@Getter
@Setter
public class CommonCodeBatchChangeSetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "추가 행")
    private List<CommonCodeGroupChangeVO> insertedRows = new ArrayList<>();

    @Schema(description = "수정 행")
    private List<CommonCodeGroupChangeVO> updatedRows = new ArrayList<>();

    @Schema(description = "삭제 행")
    private List<CommonCodeGroupChangeVO> deletedRows = new ArrayList<>();

    public void setInsertedRows(List<CommonCodeGroupChangeVO> insertedRows) {
        this.insertedRows = insertedRows == null ? new ArrayList<>() : insertedRows;
    }

    public void setUpdatedRows(List<CommonCodeGroupChangeVO> updatedRows) {
        this.updatedRows = updatedRows == null ? new ArrayList<>() : updatedRows;
    }

    public void setDeletedRows(List<CommonCodeGroupChangeVO> deletedRows) {
        this.deletedRows = deletedRows == null ? new ArrayList<>() : deletedRows;
    }
}
