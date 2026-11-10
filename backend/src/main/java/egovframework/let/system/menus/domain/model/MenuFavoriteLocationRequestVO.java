package egovframework.let.system.menus.domain.model;

import javax.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MenuFavoriteLocationRequestVO {
    @Positive
    private Long folderId;

    private String favoriteName;
}
