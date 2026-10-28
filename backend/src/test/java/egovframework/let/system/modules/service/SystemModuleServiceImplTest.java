package egovframework.let.system.modules.service;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import egovframework.let.system.modules.domain.model.SystemModuleSaveRequestVO;
import egovframework.let.system.modules.domain.model.SystemModuleVO;
import egovframework.let.system.modules.domain.repository.SystemModuleDAO;
import egovframework.let.system.modules.service.impl.SystemModuleServiceImpl;

class SystemModuleServiceImplTest {

    @Test
    void updateModuleIncludesModuleCodeInUpdateParams() throws Exception {
        SystemModuleDAO systemModuleDAO = mock(SystemModuleDAO.class);
        SystemModuleServiceImpl service = new SystemModuleServiceImpl(systemModuleDAO);

        SystemModuleVO existing = new SystemModuleVO();
        existing.setModuleId(11L);
        existing.setTenantId(1L);
        existing.setModuleCode("OLD_CODE");
        existing.setModuleNm("기존모듈");

        when(systemModuleDAO.selectModuleById(anyMap())).thenReturn(existing);
        when(systemModuleDAO.selectModuleIdByCode(anyMap())).thenReturn(null);

        SystemModuleSaveRequestVO payload = new SystemModuleSaveRequestVO();
        payload.setModuleCode("NEW_CODE");
        payload.setModuleNm("새모듈");
        payload.setIconNm("Folder");
        payload.setModuleUrl("/new");
        payload.setSortOrder(3);
        payload.setUseAt("Y");

        service.updateModule(1L, 11L, payload);

        verify(systemModuleDAO).updateModule(argThat(params ->
                "NEW_CODE".equals(params.get("moduleCode"))
                        && "새모듈".equals(params.get("moduleNm"))
                        && 3 == ((Number) params.get("sortOrder")).intValue()));
    }
}
