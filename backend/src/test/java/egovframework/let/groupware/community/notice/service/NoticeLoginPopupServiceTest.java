package egovframework.let.groupware.community.notice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;

class NoticeLoginPopupServiceTest {
    private final NoticeBoardDAO dao = mock(NoticeBoardDAO.class);
    private final NoticeBoardService posts = mock(NoticeBoardService.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-22T15:00:00Z"), ZoneId.of("Asia/Seoul"));
    private final NoticeLoginPopupService service = new NoticeLoginPopupService(dao, posts, clock);

    @Test
    void listUsesKoreanDateAndAuthenticatedAccountWithoutCountingViews() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(10L);
        when(dao.selectLoginPopupList(anyMap())).thenReturn(Collections.emptyList());
        assertThat(service.list(7L, "reader")).isEmpty();
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectLoginPopupList(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 7L).containsEntry("loginId", 10L)
                .containsEntry("today", "2026-10-23");
        verifyNoInteractions(posts);
        verify(dao, never()).incrementNoticePostViewCount(anyMap());
    }

    @Test
    void detailCountsOnlyTheCurrentlyEligiblePostThroughExistingUniqueReaderLogic() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(10L);
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        when(dao.selectLoginPopupById(anyMap())).thenReturn(post);
        when(posts.getPost(7L, 42L, "reader")).thenReturn(post);
        assertThat(service.detail(7L, 42L, "reader")).isSameAs(post);
        verify(posts).getPost(7L, 42L, "reader");
    }

    @Test
    void expiredDeletedOrDismissedPostDoesNotCountViews() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(10L);
        assertThatThrownBy(() -> service.detail(7L, 42L, "reader"))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        verifyNoInteractions(posts);
    }

    @Test
    void dismissUsesServerDateAndDoesNotCountViews() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(10L);
        when(dao.dismissLoginPopup(anyMap())).thenReturn(1);
        service.dismissToday(7L, 42L, "reader");
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).dismissLoginPopup(params.capture());
        assertThat(params.getValue()).containsEntry("postId", 42L).containsEntry("today", "2026-10-23");
        verifyNoInteractions(posts);
    }

    @Test
    void invalidAccountNeverReadsOtherUsersPopupState() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(null);
        assertThatThrownBy(() -> service.list(7L, "missing")).isInstanceOf(IllegalStateException.class);
        verify(dao, never()).selectLoginPopupList(anyMap());
    }

    @Test
    void dailyCutoffChangesExactlyAtKoreanMidnight() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(10L);
        for (String instant : new String[] {"2026-10-22T14:59:59Z", "2026-10-22T15:00:00Z"}) {
            new NoticeLoginPopupService(dao, posts, Clock.fixed(Instant.parse(instant), ZoneId.of("Asia/Seoul")))
                    .list(7L, "reader");
        }
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao, times(2)).selectLoginPopupList(params.capture());
        assertThat(params.getAllValues().get(0)).containsEntry("today", "2026-10-22");
        assertThat(params.getAllValues().get(1)).containsEntry("today", "2026-10-23");
    }

    @Test
    void dismissingAnUnavailableNoticeReturnsNotFound() throws Exception {
        when(dao.selectLoginIdByLoginCode(anyMap())).thenReturn(10L);
        assertThatThrownBy(() -> service.dismissToday(7L, 42L, "reader"))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("404");
        verifyNoInteractions(posts);
    }
}
