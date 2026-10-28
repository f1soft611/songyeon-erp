package egovframework.let.groupware.community.notice.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;

import org.junit.jupiter.api.Test;

import egovframework.let.common.dto.ListResult;

class NoticeBoardPostSearchVOTest {

    @Test
    void keepsCommonPaginationFieldsAndNoticeSearchFields() {
        NoticeBoardPostSearchVO search = new NoticeBoardPostSearchVO();

        search.setPageIndex(2);
        search.setPageUnit(20);
        search.setPageSize(10);
        search.setKeyword("maintenance");
        search.setNoticeGubunCode("SYSTEM");
        search.setIsPinned("Y");
        search.setTenantId(7L);

        assertThat(search.getPageIndex()).isEqualTo(2);
        assertThat(search.getPageUnit()).isEqualTo(20);
        assertThat(search.getPageSize()).isEqualTo(10);
        assertThat(search.getKeyword()).isEqualTo("maintenance");
        assertThat(search.getNoticeGubunCode()).isEqualTo("SYSTEM");
        assertThat(search.getIsPinned()).isEqualTo("Y");
        assertThat(search.getTenantId()).isEqualTo(7L);
    }

    @Test
    void returnsListAndTotalCountThroughCommonResult() {
        ListResult<String> result = new ListResult<>(
            Arrays.asList("first", "second"),
            5L
        );

        assertThat(result.getResultList()).containsExactly("first", "second");
        assertThat(result.getResultCnt()).isEqualTo(5L);
    }
}