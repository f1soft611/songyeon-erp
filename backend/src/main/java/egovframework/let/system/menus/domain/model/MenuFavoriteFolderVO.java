package egovframework.let.system.menus.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MenuFavoriteFolderVO {
    private Long folderId;
    private String folderName;
    private Long tenantId;
    private String userId;
}
