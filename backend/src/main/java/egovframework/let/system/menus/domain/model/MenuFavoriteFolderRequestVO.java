package egovframework.let.system.menus.domain.model;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MenuFavoriteFolderRequestVO {
    @NotBlank
    @Size(max = 200)
    private String folderName;
}
