package egovframework.let.uat.uia.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.domain.model.MyProfileUpdateRequestVO;
import egovframework.let.uat.uia.domain.model.MyProfileVO;
import egovframework.let.uat.uia.domain.model.PasswordChangeRequestVO;

public interface ProfileSettingsService {
    MyProfileVO getMyProfile(LoginVO user) throws Exception;

    MyProfileVO updateMyProfile(LoginVO user, MyProfileUpdateRequestVO request) throws Exception;

    void changeMyPassword(LoginVO user, PasswordChangeRequestVO request) throws Exception;
}
