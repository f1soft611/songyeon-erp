package egovframework.let.system.serversettings.domain.repository;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.system.serversettings.domain.model.ServerSettingVO;

/**
 * 기초정보 - 서버관리 데이터 접근 클래스 (송연 external_api_settings)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Repository("serverSettingDAO")
public class ServerSettingDAO extends EgovAbstractMapper {

    /** 서비스 한 개. 없으면 null. */
    public ServerSettingVO selectServerSetting(String serviceKey) throws Exception {
        return selectOne("ServerSettingDAO.selectServerSetting", serviceKey);
    }
}
