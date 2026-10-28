package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 폴더 한 줄 VO 클래스 (송연 /api/doc-folders)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "폴더 한 줄 VO 클래스 (송연 /api/doc-folders)")
@Getter
@Setter
public class DocFolderVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long parentId;
    private String name;
    private String createdBy;
    private String createdAt;
    private String kind;
    private String department;
    private String ownerId;
    private String ownerName;
    /** 흩뜨려 적어둔 것이라도 화면으로 내보낼 까닭이 없다. 걸렸는지만 locked 로 알려준다 */
    @JsonIgnore
    private String lockHash;
    private String lockBy;
    private String lockAt;
    private Integer fileCount;
    private Integer childCount;
    private String rootKind;
    private String rootOwnerId;
    private String rootOwnerName;
    private Long sharedRootId;
    private boolean sharedRoot;
    private boolean mine;
    private boolean locked;
    private boolean unlocked;
}
