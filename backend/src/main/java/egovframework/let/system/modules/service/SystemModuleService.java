package egovframework.let.system.modules.service;

import java.util.List;

import egovframework.let.system.modules.domain.model.SystemModuleSaveRequestVO;
import egovframework.let.system.modules.domain.model.SystemModuleVO;

/**
 * 모듈 관리를 위한 서비스 인터페이스 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
public interface SystemModuleService {

    /**
     * 테넌트 기준 모듈 목록을 조회한다.
     *
     * @param tenantId
     * @exception Exception
     */
    List<SystemModuleVO> listModules(Long tenantId) throws Exception;

    /**
     * 모듈을 등록한다.
     *
     * @param tenantId
     * @param payload
     * @exception Exception
     */
    SystemModuleVO createModule(Long tenantId, SystemModuleSaveRequestVO payload) throws Exception;

    /**
     * 모듈을 수정한다.
     *
     * @param tenantId
     * @param moduleId
     * @param payload
     * @exception Exception
     */
    SystemModuleVO updateModule(Long tenantId, Long moduleId, SystemModuleSaveRequestVO payload) throws Exception;

    /**
     * 모듈을 삭제한다. 하위 메뉴가 있으면 거부한다.
     *
     * @param tenantId
     * @param moduleId
     * @exception Exception
     */
    void deleteModule(Long tenantId, Long moduleId) throws Exception;
}
