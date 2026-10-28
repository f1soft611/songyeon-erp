package egovframework.let.uss.auth.service;

import java.io.Serializable;
import java.util.Date;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 권한 유형 VO 클래스
 * @author S-ERP
 * @since 2024.01.01
 * @version 1.0
 */
@Schema(description = "권한 유형 VO")
@Getter
@Setter
public class PermissionTypeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "권한 ID")
    private Long permissionId;

    @Schema(description = "권한 코드")
    private String permissionCode = "";

    @Schema(description = "권한명")
    private String permissionNm = "";

    @Schema(description = "권한 설명")
    private String permissionDc = "";

    @Schema(description = "권한 레벨 (read/write)")
    private String permissionLevel = "read";

    @Schema(description = "사용여부")
    private String useAt = "Y";

    @Schema(description = "최초등록일시")
    private Date frstRegistPnttm;

    @Schema(description = "최초등록자ID")
    private String frstRegisterId = "";

    @Schema(description = "최종수정일시")
    private Date lastUpdtPnttm;

    @Schema(description = "최종수정자ID")
    private String lastUpdusrId = "";
}