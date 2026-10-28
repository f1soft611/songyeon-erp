package egovframework.let.system.menus.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 메뉴별 CRUD 권한을 표현하는 VO 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Schema(description = "메뉴 권한 모델")
@Getter
@Setter
public class MenuPermissionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "조회 가능 여부")
    private boolean read;

    @Schema(description = "등록 가능 여부")
    private boolean create;

    @Schema(description = "수정 가능 여부")
    private boolean update;

    @Schema(description = "삭제 가능 여부")
    private boolean delete;

    @Schema(description = "엑셀 가능 여부")
    private boolean excel;

    public MenuPermissionVO() {
    }

    public MenuPermissionVO(boolean read, boolean create, boolean update, boolean delete) {
        this(read, create, update, delete, false);
    }

    public MenuPermissionVO(boolean read, boolean create, boolean update, boolean delete, boolean excel) {
        this.read = read;
        this.create = create;
        this.update = update;
        this.delete = delete;
        this.excel = excel;
    }
}
