package egovframework.let.common.pagination;

import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.egovframe.rte.ptl.mvc.tags.ui.pagination.PaginationInfo;

import egovframework.com.cmm.ComDefaultVO;

public final class EgovPaginationSupport {

    private EgovPaginationSupport() {
    }

    public static void apply(ComDefaultVO itemVO, EgovPropertyService propertyService) {
        if (itemVO == null) {
            return;
        }

        PaginationInfo paginationInfo = new PaginationInfo();
        paginationInfo.setCurrentPageNo(itemVO.getPageIndex());
        paginationInfo.setRecordCountPerPage(
            itemVO.getPageUnit() > 0
                ? itemVO.getPageUnit()
                : readProperty(propertyService, "Globals.pageUnit", 10)
        );
        paginationInfo.setPageSize(readProperty(propertyService, "Globals.pageSize", 10));

        itemVO.setFirstIndex(paginationInfo.getFirstRecordIndex());
        itemVO.setLastIndex(paginationInfo.getLastRecordIndex());
        itemVO.setRecordCountPerPage(paginationInfo.getRecordCountPerPage());
    }

    private static int readProperty(
            EgovPropertyService propertyService, String key, int fallback) {
        if (propertyService == null) {
            return fallback;
        }
        int value = propertyService.getInt(key);
        return value > 0 ? value : fallback;
    }
}