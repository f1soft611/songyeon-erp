package egovframework.let.uat.uia.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordChangeRequestVO {
    private String currentPassword;
    private String newPassword;
    private String newPasswordConfirm;
}
