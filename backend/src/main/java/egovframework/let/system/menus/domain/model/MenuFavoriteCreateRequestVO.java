package egovframework.let.system.menus.domain.model;

import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MenuFavoriteCreateRequestVO {
    @NotNull
    @Positive
    private Long menuId;

    @Positive
    private Long folderId;

    private String favoriteName;
}
