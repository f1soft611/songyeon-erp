package egovframework.let.co.master.commoncode.service.impl;

import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchChangeSetVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchItemChangeSetVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupChangeVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemChangeVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;

class CommonCodeBatchServiceImplTest {

    @Mock
    private CommonCodeGroupDAO commonCodeGroupDAO;

    @Mock
    private CommonCodeItemDAO commonCodeItemDAO;

    @Mock
    private CommonCodeGroupService commonCodeGroupService;

    @Mock
    private CommonCodeItemService commonCodeItemService;

    private CommonCodeBatchServiceImpl service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new CommonCodeBatchServiceImpl(
                commonCodeGroupDAO,
                commonCodeItemDAO,
                commonCodeGroupService,
                commonCodeItemService);
    }

    @Test
    void saveBatchDeletesItemsBeforeGroupsInTheSameBatch() throws Exception {
        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(10L);
        when(commonCodeGroupDAO.selectGroupById(anyMap())).thenReturn(group);
        doNothing().when(commonCodeItemService).deleteItem(1L, 10L, 99L);
        doNothing().when(commonCodeGroupService).deleteGroup(1L, 10L);

        CommonCodeBatchSaveRequestVO payload = new CommonCodeBatchSaveRequestVO();

        CommonCodeBatchChangeSetVO groups = new CommonCodeBatchChangeSetVO();
        CommonCodeGroupChangeVO groupRow = new CommonCodeGroupChangeVO();
        groupRow.setId("10");
        groupRow.setGroupCode("ROOT");
        groupRow.setGroupNm("루트 그룹");
        groupRow.setParentGroupId(null);
        groups.setDeletedRows(Collections.singletonList(groupRow));
        payload.setGroups(groups);

        CommonCodeBatchItemChangeSetVO items = new CommonCodeBatchItemChangeSetVO();
        CommonCodeItemChangeVO itemRow = new CommonCodeItemChangeVO();
        itemRow.setId("99");
        itemRow.setGroupId("10");
        itemRow.setItemCode("DOC");
        itemRow.setItemNm("문서");
        itemRow.setUseAt("Y");
        items.setDeletedRows(Collections.singletonList(itemRow));
        payload.setItems(items);

        service.saveBatch(1L, payload);

        InOrder order = inOrder(commonCodeItemService, commonCodeGroupService);
        order.verify(commonCodeItemService).deleteItem(1L, 10L, 99L);
        order.verify(commonCodeGroupService).deleteGroup(1L, 10L);
    }

    @Test
    void saveBatchAllowsEmptyItemCodeForNewRowsSoServiceCanGenerateIt() throws Exception {
        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(10L);
        when(commonCodeGroupDAO.selectGroupById(anyMap())).thenReturn(group);
        when(commonCodeItemService.createItem(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.any(CommonCodeItemSaveRequestVO.class)))
                .thenReturn(new CommonCodeItemVO());

        CommonCodeBatchSaveRequestVO payload = new CommonCodeBatchSaveRequestVO();
        CommonCodeBatchItemChangeSetVO items = new CommonCodeBatchItemChangeSetVO();
        CommonCodeItemChangeVO row = new CommonCodeItemChangeVO();
        row.setId("new-item");
        row.setGroupId("10");
        row.setItemCode("");
        row.setItemNm("자동발번 항목");
        items.setInsertedRows(Collections.singletonList(row));
        payload.setItems(items);

        service.saveBatch(1L, payload);

        verify(commonCodeItemService).createItem(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(10L),
                org.mockito.ArgumentMatchers.argThat(item -> item.getItemCode().isEmpty()));
    }

    @Test
    void saveBatchStillRequiresItemCodeWhenUpdatingExistingRows() throws Exception {
        CommonCodeBatchSaveRequestVO payload = new CommonCodeBatchSaveRequestVO();
        CommonCodeBatchItemChangeSetVO items = new CommonCodeBatchItemChangeSetVO();
        CommonCodeItemChangeVO row = new CommonCodeItemChangeVO();
        row.setId("77");
        row.setGroupId("10");
        row.setItemCode("");
        row.setItemNm("수정 항목");
        items.setUpdatedRows(Collections.singletonList(row));
        payload.setItems(items);

        assertThatThrownBy(() -> service.saveBatch(1L, payload))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("상세코드는 필수입니다.");
        verify(commonCodeItemService, never()).updateItem(
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any(CommonCodeItemSaveRequestVO.class));
    }
}
