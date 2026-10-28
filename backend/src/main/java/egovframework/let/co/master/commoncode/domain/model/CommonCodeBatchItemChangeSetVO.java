package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "공통코드 상세 변경 세트")
@Getter
@Setter
public class CommonCodeBatchItemChangeSetVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "추가 행")
    private List<CommonCodeItemChangeVO> insertedRows = new ArrayList<>();

    @Schema(description = "수정 행")
    private List<CommonCodeItemChangeVO> updatedRows = new ArrayList<>();

    @Schema(description = "삭제 행")
    private List<CommonCodeItemChangeVO> deletedRows = new ArrayList<>();

    public void setInsertedRows(List<CommonCodeItemChangeVO> insertedRows) {
        this.insertedRows = insertedRows == null ? new ArrayList<>() : insertedRows;
    }

    public void setUpdatedRows(List<CommonCodeItemChangeVO> updatedRows) {
        this.updatedRows = updatedRows == null ? new ArrayList<>() : updatedRows;
    }

    public void setDeletedRows(List<CommonCodeItemChangeVO> deletedRows) {
        this.deletedRows = deletedRows == null ? new ArrayList<>() : deletedRows;
    }
}
