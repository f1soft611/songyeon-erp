package egovframework.let.system.menus.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MenuFavoriteVO {
    private Long favoriteId;
    private Long menuId;
    private Long folderId;
    private String favoriteName;
}
