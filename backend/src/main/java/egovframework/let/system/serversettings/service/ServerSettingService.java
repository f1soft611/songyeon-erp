package egovframework.let.system.serversettings.service;

import egovframework.let.system.serversettings.domain.model.ServerSettingVO;

/**
 * 기초정보 - 서버관리 서비스 인터페이스 클래스
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public interface ServerSettingService {

    /**
     * 외부 서비스 접속 정보(키·SECRET 을 푼 값 · 주소). 서버 안에서 외부를 부를 때만 쓴다 — 화면으로 내보내지 않는다.
     * 등록된 줄이 없으면 빈 값들을 돌려준다(송연 common.get_external_api_setting).
     */
    ServerSettingVO credentialOf(String serviceKey) throws Exception;
}
