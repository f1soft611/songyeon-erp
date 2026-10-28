package egovframework.let.common.pagination;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.egovframe.rte.fdl.property.EgovPropertyService;

import egovframework.com.cmm.ComDefaultVO;

class EgovPaginationSupportTest {

    @Test
    void appliesLegacyPaginationInfoFieldsToACommonSearchVO() {
        ComDefaultVO search = new ComDefaultVO();
        search.setPageIndex(3);
        search.setPageUnit(20);
        search.setPageSize(10);

        EgovPropertyService propertyService = mock(EgovPropertyService.class);
        when(propertyService.getInt("Globals.pageUnit")).thenReturn(10);
        when(propertyService.getInt("Globals.pageSize")).thenReturn(10);

        EgovPaginationSupport.apply(search, propertyService);

        assertThat(search.getFirstIndex()).isEqualTo(40);
        assertThat(search.getLastIndex()).isEqualTo(60);
        assertThat(search.getRecordCountPerPage()).isEqualTo(20);
    }
}