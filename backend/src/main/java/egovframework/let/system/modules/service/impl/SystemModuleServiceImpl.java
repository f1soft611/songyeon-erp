package egovframework.let.system.modules.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.system.modules.domain.model.SystemModuleSaveRequestVO;
import egovframework.let.system.modules.domain.model.SystemModuleSearchConditionVO;
import egovframework.let.system.modules.domain.model.SystemModuleVO;
import egovframework.let.system.modules.domain.repository.SystemModuleDAO;
import egovframework.let.system.modules.service.SystemModuleService;

/**
 * 모듈 관리를 위한 서비스 구현 클래스
 * @author S-ERP
 * @since 2026.08.31
 * @version 1.0
 */
@Service("systemModuleService")
public class SystemModuleServiceImpl extends EgovAbstractServiceImpl implements SystemModuleService {

    private final SystemModuleDAO systemModuleDAO;

    public SystemModuleServiceImpl(SystemModuleDAO systemModuleDAO) {
        this.systemModuleDAO = systemModuleDAO;
    }

    @Override
    public List<SystemModuleVO> listModules(Long tenantId) throws Exception {
        SystemModuleSearchConditionVO condition = new SystemModuleSearchConditionVO();
        condition.setTenantId(tenantId);
        return systemModuleDAO.selectModuleList(condition);
    }

    @Override
    @Transactional
    public SystemModuleVO createModule(Long tenantId, SystemModuleSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getModuleCode())) {
            throw new IllegalArgumentException("모듈 코드는 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getModuleNm())) {
            throw new IllegalArgumentException("모듈명은 필수입니다.");
        }

        validateModuleCodeDuplication(tenantId, payload.getModuleCode(), null);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("moduleCode", payload.getModuleCode().trim());
        params.put("moduleNm", payload.getModuleNm().trim());
        params.put("iconNm", payload.getIconNm());
        params.put("moduleUrl", payload.getModuleUrl());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");

        Long newId = systemModuleDAO.insertModule(params);
        return findByIdOrThrow(tenantId, newId);
    }

    @Override
    @Transactional
    public SystemModuleVO updateModule(Long tenantId, Long moduleId, SystemModuleSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getModuleCode())) {
            throw new IllegalArgumentException("모듈 코드는 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getModuleNm())) {
            throw new IllegalArgumentException("모듈명은 필수입니다.");
        }

        findByIdOrThrow(tenantId, moduleId);

        String moduleCode = payload.getModuleCode() == null ? null : payload.getModuleCode().trim();
        if (StringUtils.hasText(moduleCode)) {
            validateModuleCodeDuplication(tenantId, moduleCode, moduleId);
        }

        Map<String, Object> params = new HashMap<>();
        params.put("moduleId", moduleId);
        params.put("tenantId", tenantId);
        params.put("moduleCode", moduleCode);
        params.put("moduleNm", payload.getModuleNm().trim());
        params.put("iconNm", payload.getIconNm());
        params.put("moduleUrl", payload.getModuleUrl());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");
        systemModuleDAO.updateModule(params);

        return findByIdOrThrow(tenantId, moduleId);
    }

    @Override
    @Transactional
    public void deleteModule(Long tenantId, Long moduleId) throws Exception {
        findByIdOrThrow(tenantId, moduleId);

        Map<String, Object> params = new HashMap<>();
        params.put("moduleId", moduleId);
        params.put("tenantId", tenantId);

        int menuCount = systemModuleDAO.countMenusByModuleId(params);
        if (menuCount > 0) {
            throw new IllegalArgumentException("하위 메뉴가 존재하는 모듈은 삭제할 수 없습니다.");
        }

        systemModuleDAO.deleteModule(params);
    }

    private SystemModuleVO findByIdOrThrow(Long tenantId, Long moduleId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("moduleId", moduleId);
        params.put("tenantId", tenantId);
        SystemModuleVO module = systemModuleDAO.selectModuleById(params);
        if (module == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "모듈을 찾을 수 없습니다.");
        }
        return module;
    }

    private void validateModuleCodeDuplication(Long tenantId, String moduleCode, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("moduleCode", moduleCode);
        Long existingId = systemModuleDAO.selectModuleIdByCode(params);
        if (existingId != null && (excludeId == null || !excludeId.equals(existingId))) {
            throw new IllegalArgumentException("이미 사용 중인 모듈 코드입니다.");
        }
    }
}
