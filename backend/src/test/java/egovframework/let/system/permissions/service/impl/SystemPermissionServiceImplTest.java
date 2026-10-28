package egovframework.let.system.permissions.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.system.permissions.domain.model.SystemPermissionVO;
import egovframework.let.system.permissions.domain.repository.SystemPermissionDAO;

class SystemPermissionServiceImplTest {

    @DisplayName("활성 권한 DAO 결과의 정렬과 항목을 변경 없이 반환한다")
    @Test
    void listActivePermissionsReturnsDaoActivePermissionsInOrder() throws Exception {
        SystemPermissionDAO systemPermissionDAO = mock(SystemPermissionDAO.class);
        SystemPermissionServiceImpl service = new SystemPermissionServiceImpl(systemPermissionDAO);
        List<SystemPermissionVO> activePermissions = Arrays.asList(
                new SystemPermissionVO(1L, "READ", "조회", 10),
                new SystemPermissionVO(3L, "CREATE", "등록", 20),
                new SystemPermissionVO(5L, "EXCEL", "엑셀", 20));
        when(systemPermissionDAO.selectActivePermissionList()).thenReturn(activePermissions);

        List<SystemPermissionVO> result = service.listActivePermissions();

        assertEquals(activePermissions, result);
        assertEquals(Arrays.asList(1L, 3L, 5L), result.stream()
                .map(SystemPermissionVO::getPermissionId)
            .collect(Collectors.toList()));
        verify(systemPermissionDAO).selectActivePermissionList();
    }
}