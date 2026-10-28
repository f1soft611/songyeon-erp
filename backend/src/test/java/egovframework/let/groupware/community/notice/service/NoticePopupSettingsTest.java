package egovframework.let.groupware.community.notice.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyMap;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.service.CommonCommentService;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.groupware.community.notice.service.impl.NoticeBoardServiceImpl;

class NoticePopupSettingsTest {
    private final NoticeBoardDAO dao = mock(NoticeBoardDAO.class);
    private final NoticeBoardServiceImpl service = new NoticeBoardServiceImpl(
            dao, mock(CommonFileService.class), mock(CommonCommentService.class));

    private NoticeBoardPostSaveRequestVO payload() {
        NoticeBoardPostSaveRequestVO request = new NoticeBoardPostSaveRequestVO();
        request.setTitle("Popup test");
        request.setNoticeGubunCode("GENERAL");
        request.setContentsHtml("<p>content</p>");
        return request;
    }

    @Test
    void settingsRoundTripThroughCreateAndUpdateWithoutChangingPin() throws Exception {
        when(dao.insertNoticePost(anyMap())).thenReturn(42L);
        when(dao.selectNoticePostById(anyMap())).thenReturn(new NoticeBoardPostVO());
        NoticeBoardPostSaveRequestVO request = payload();
        request.setLoginPopupYn("Y");
        request.setPopupEndDate("2026-10-31");
        request.setIsPinned("Y");
        service.createPost(7L, request, "writer", "Writer");
        service.updatePost(7L, 42L, request, "writer", "Writer");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertNoticePost(params.capture());
        verify(dao).updateNoticePost(params.capture());
        for (Map<String, Object> value : params.getAllValues()) {
            assertThat(value).containsEntry("tenantId", 7L).containsEntry("loginPopupYn", "Y")
                    .containsEntry("popupEndDate", "2026-10-31").containsEntry("isPinned", "Y");
        }
    }

    @Test
    void enabledPopupRequiresRealCalendarDateBeforeWriting() throws Exception {
        for (String date : new String[] {null, "", "2026-02-30", "2026-1-01", "0000-01-01", "not-a-date"}) {
            NoticeBoardPostSaveRequestVO request = payload();
            request.setLoginPopupYn("Y");
            request.setPopupEndDate(date);
            assertThatThrownBy(() -> service.createPost(7L, request, "writer", "Writer"))
                    .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        }
        verify(dao, never()).insertNoticePost(anyMap());
    }

    @Test
    void disabledPopupClearsDateAndRejectsUnknownFlag() throws Exception {
        when(dao.insertNoticePost(anyMap())).thenReturn(42L);
        when(dao.selectNoticePostById(anyMap())).thenReturn(new NoticeBoardPostVO());
        NoticeBoardPostSaveRequestVO request = payload();
        request.setPopupEndDate("2026-10-31");
        service.createPost(7L, request, "writer", "Writer");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertNoticePost(params.capture());
        assertThat(params.getValue()).containsEntry("loginPopupYn", "N").containsEntry("popupEndDate", null);
        request.setLoginPopupYn("OTHER");
        assertThatThrownBy(() -> service.createPost(7L, request, "writer", "Writer"))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
    }
}
