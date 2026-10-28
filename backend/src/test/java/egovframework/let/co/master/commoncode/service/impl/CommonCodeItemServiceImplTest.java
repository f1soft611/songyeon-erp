package egovframework.let.co.master.commoncode.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;
import egovframework.let.common.idsequence.service.IdSequenceService;

class CommonCodeItemServiceImplTest {

    @Mock
    private CommonCodeGroupDAO commonCodeGroupDAO;

    @Mock
    private CommonCodeItemDAO commonCodeItemDAO;

    @Mock
    private IdSequenceService idSequenceService;

    private CommonCodeItemServiceImpl service;

    @BeforeEach
    void setUp() throws Exception {
        MockitoAnnotations.openMocks(this);
        service = new CommonCodeItemServiceImpl(commonCodeGroupDAO, commonCodeItemDAO, idSequenceService);

        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(24L);
        when(commonCodeGroupDAO.selectGroupById(anyMap())).thenReturn(group);
        when(commonCodeItemDAO.selectItemIdByCode(anyMap())).thenReturn(null);
        when(commonCodeItemDAO.insertItem(anyMap())).thenReturn(77L);
        CommonCodeItemVO savedItem = new CommonCodeItemVO();
        savedItem.setCommonCodeItemId(77L);
        savedItem.setGroupId(24L);
        savedItem.setItemCode("001");
        savedItem.setItemNm("항목");
        when(commonCodeItemDAO.selectItemById(anyMap())).thenReturn(savedItem);
    }

    @Test
    void generatesPaddedItemCodeScopedByGroupWhenCodeIsEmpty() throws Exception {
        when(idSequenceService.nextValue("COMMON_CODE_ITEM_CODE", "24", "")).thenReturn(1L);
        CommonCodeItemSaveRequestVO payload = payload("");

        CommonCodeItemVO saved = service.createItem(1L, 24L, payload);

        assertThat(saved.getItemCode()).isEqualTo("001");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(commonCodeItemDAO).insertItem(params.capture());
        assertThat(params.getValue().get("itemCode")).isEqualTo("001");
        verify(idSequenceService).nextValue("COMMON_CODE_ITEM_CODE", "24", "");
    }

    @Test
    void doesNotTruncateGeneratedValuesThatExceedThreeDigits() throws Exception {
        when(idSequenceService.nextValue("COMMON_CODE_ITEM_CODE", "24", "")).thenReturn(1000L);

        service.createItem(1L, 24L, payload(""));

        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(commonCodeItemDAO).insertItem(params.capture());
        assertThat(params.getValue().get("itemCode")).isEqualTo("1000");
    }

    @Test
    void keepsManuallyEnteredNumericCodeAndAdvancesItsCounter() throws Exception {
        CommonCodeItemSaveRequestVO payload = payload("007");

        service.createItem(1L, 24L, payload);

        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(commonCodeItemDAO).insertItem(params.capture());
        assertThat(params.getValue().get("itemCode")).isEqualTo("007");
        verify(idSequenceService).advanceToAtLeast("COMMON_CODE_ITEM_CODE", "24", "", 7L);
        verify(idSequenceService, never()).nextValue("COMMON_CODE_ITEM_CODE", "24", "");
    }

    @Test
    void leavesManuallyEnteredTextCodeUnchangedWithoutUsingTheSequence() throws Exception {
        CommonCodeItemSaveRequestVO payload = payload("MANUAL");

        service.createItem(1L, 24L, payload);

        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(commonCodeItemDAO).insertItem(params.capture());
        assertThat(params.getValue().get("itemCode")).isEqualTo("MANUAL");
        verify(idSequenceService, never()).nextValue("COMMON_CODE_ITEM_CODE", "24", "");
        verify(idSequenceService, never()).advanceToAtLeast(
                "COMMON_CODE_ITEM_CODE", "24", "", 0L);
    }

    private CommonCodeItemSaveRequestVO payload(String itemCode) {
        CommonCodeItemSaveRequestVO payload = new CommonCodeItemSaveRequestVO();
        payload.setItemCode(itemCode);
        payload.setItemNm("항목");
        return payload;
    }
}