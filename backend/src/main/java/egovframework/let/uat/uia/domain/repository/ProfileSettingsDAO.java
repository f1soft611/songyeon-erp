package egovframework.let.uat.uia.domain.repository;

import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.uat.uia.domain.model.MyProfileVO;

@Repository("profileSettingsDAO")
public class ProfileSettingsDAO extends EgovAbstractMapper {

    public MyProfileVO selectMyProfile(Map<String, Object> params) throws Exception {
        return (MyProfileVO) selectOne("loginDAO.selectMyProfile", params);
    }

    public void updateMyProfile(Map<String, Object> params) throws Exception {
        update("loginDAO.updateUserEmail", params);
        update("loginDAO.updateLoginImages", params);
    }

    public String selectPasswordHash(Map<String, Object> params) throws Exception {
        return (String) selectOne("loginDAO.selectCurrentPasswordHash", params);
    }

    public void updatePassword(Map<String, Object> params) throws Exception {
        update("loginDAO.updateCurrentPassword", params);
    }
}
