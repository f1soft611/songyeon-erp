package egovframework.let.system.menus.domain.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MenuFavoritesResponseVO {
    private List<MenuFavoriteFolderVO> folders;
    private List<MenuFavoriteVO> favorites;
}
