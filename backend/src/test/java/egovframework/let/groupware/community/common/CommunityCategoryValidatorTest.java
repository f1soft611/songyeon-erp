package egovframework.let.groupware.community.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;

class CommunityCategoryValidatorTest {

    private CommonCodeGroupDAO groupDAO;
    private CommonCodeItemDAO itemDAO;
    private CommunityCategoryValidator validator;

    @BeforeEach
    void setUp() throws Exception {
        groupDAO = org.mockito.Mockito.mock(CommonCodeGroupDAO.class);
        itemDAO = org.mockito.Mockito.mock(CommonCodeItemDAO.class);
        validator = new CommunityCategoryValidator(groupDAO, itemDAO);

        Map<String, Object> groupParams = new HashMap<>();
        groupParams.put("tenantId", 71L);
        groupParams.put("groupCode", "NOTICE_GUBUN");
        when(groupDAO.selectGroupList(groupParams))
                .thenReturn(Collections.singletonList(activeGroup(101L, "NOTICE_GUBUN")));
        groupParams = new HashMap<>();
        groupParams.put("tenantId", 71L);
        groupParams.put("groupCode", "WF_ARCHIVE_CATEGORY");
        when(groupDAO.selectGroupList(groupParams))
                .thenReturn(Collections.singletonList(activeGroup(202L, "WF_ARCHIVE_CATEGORY")));
    }

    @Test
    void noticeUsesOnlyActiveNoticeGroupItems() throws Exception {
        when(itemDAO.selectItemList(itemParams(101L)))
                .thenReturn(Collections.singletonList(activeItem(101L, "GENERAL")));

        validator.validate(71L, "NOTICE", "GENERAL");

        verify(groupDAO).selectGroupList(groupParams("NOTICE_GUBUN"));
        verify(itemDAO).selectItemList(itemParams(101L));
    }

    @Test
    void archiveUsesOnlyActiveArchiveGroupItems() throws Exception {
        when(itemDAO.selectItemList(itemParams(202L)))
                .thenReturn(Collections.singletonList(activeItem(202L, "MANUAL")));

        validator.validate(71L, "ARCHIVE", "MANUAL");

        verify(groupDAO).selectGroupList(groupParams("WF_ARCHIVE_CATEGORY"));
        verify(itemDAO).selectItemList(itemParams(202L));
    }

    @Test
    void rejectsCategoryFromTheOtherBoardGroup() throws Exception {
        when(itemDAO.selectItemList(itemParams(202L)))
                .thenReturn(Collections.singletonList(activeItem(202L, "MANUAL")));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> validator.validate(71L, "NOTICE", "MANUAL"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void rejectsInactiveCategoryAndInactiveGroup() throws Exception {
        when(itemDAO.selectItemList(itemParams(101L)))
                .thenReturn(Collections.singletonList(inactiveItem(101L, "DISABLED")));
        assertThat(assertThrows(ResponseStatusException.class,
                () -> validator.validate(71L, "NOTICE", "DISABLED")).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Map<String, Object> groupParams = new HashMap<>();
        groupParams.put("tenantId", 71L);
        groupParams.put("groupCode", "NOTICE_GUBUN");
        when(groupDAO.selectGroupList(groupParams))
                .thenReturn(Collections.singletonList(inactiveGroup(101L, "NOTICE_GUBUN")));
        assertThat(assertThrows(ResponseStatusException.class,
                () -> validator.validate(71L, "NOTICE", "GENERAL")).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private Map<String, Object> itemParams(Long groupId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("groupId", groupId);
        return params;
    }

    private Map<String, Object> groupParams(String groupCode) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 71L);
        params.put("groupCode", groupCode);
        return params;
    }

    private CommonCodeGroupVO activeGroup(Long groupId, String groupCode) {
        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(groupId);
        group.setGroupCode(groupCode);
        group.setUseAt("Y");
        return group;
    }

    private CommonCodeGroupVO inactiveGroup(Long groupId, String groupCode) {
        CommonCodeGroupVO group = activeGroup(groupId, groupCode);
        group.setUseAt("N");
        return group;
    }

    private CommonCodeItemVO activeItem(Long groupId, String code) {
        CommonCodeItemVO item = new CommonCodeItemVO();
        item.setGroupId(groupId);
        item.setItemCode(code);
        item.setUseAt("Y");
        return item;
    }

    private CommonCodeItemVO inactiveItem(Long groupId, String code) {
        CommonCodeItemVO item = activeItem(groupId, code);
        item.setUseAt("N");
        return item;
    }
}
