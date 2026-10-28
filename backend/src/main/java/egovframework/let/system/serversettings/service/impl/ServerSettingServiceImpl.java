package egovframework.let.system.serversettings.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.util.SecretsStore;
import egovframework.let.system.serversettings.domain.model.ServerSettingVO;
import egovframework.let.system.serversettings.domain.repository.ServerSettingDAO;
import egovframework.let.system.serversettings.service.ServerSettingService;

/**
 * 기초정보 - 서버관리 서비스 구현 클래스
 * 송연 변환본(CM0001Service 서버관리 부분, 기존 list_server_settings·update_server_settings)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Service("serverSettingService")
public class ServerSettingServiceImpl extends EgovAbstractServiceImpl implements ServerSettingService {

    private final ServerSettingDAO serverSettingDAO;
    private final SecretsStore secretsStore;

    public ServerSettingServiceImpl(ServerSettingDAO serverSettingDAO, SecretsStore secretsStore) {
        this.serverSettingDAO = serverSettingDAO;
        this.secretsStore = secretsStore;
    }

    @Override
    public ServerSettingVO credentialOf(String serviceKey) throws Exception {
        ServerSettingVO row = serverSettingDAO.selectServerSetting(serviceKey);
        ServerSettingVO out = new ServerSettingVO();
        out.setServiceKey(serviceKey);
        out.setApiKey(row == null ? "" : secretsStore.unlock(row.getApiKey()));
        out.setApiSecret(row == null ? "" : secretsStore.unlock(row.getApiSecret()));
        out.setBaseUrl(row == null || row.getBaseUrl() == null ? "" : row.getBaseUrl());
        return out;
    }
}
