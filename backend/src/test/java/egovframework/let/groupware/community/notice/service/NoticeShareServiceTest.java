package egovframework.let.groupware.community.notice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.service.impl.NoticeBoardServiceImpl;
import egovframework.let.groupware.shared.service.ShareTokenCodec;

class NoticeShareServiceTest {
    private final NoticeBoardService notices = mock(NoticeBoardService.class);
    private final ShareTokenCodec tokens =
            new ShareTokenCodec("unit-test-share-key-not-for-production-12345");
    private final NoticeShareService service = new NoticeShareService(notices, tokens);
    private final LoginVO user = new LoginVO();
    private final NoticeBoardPostVO post = new NoticeBoardPostVO();

    @BeforeEach
    void setUp() throws Exception {
        user.setId("test-user");
        user.setTenantId(4L);
        post.setPostId(42L);
        post.setTitle("Readable notice");
        when(notices.getPost(4L, 42L)).thenReturn(post);
    }

    @Test
    void issuesAndResolvesTenantBoundNoticeShareTokens() throws Exception {
        String token = service.issue(user, 42L);

        assertThat(token).matches("v1\\.[A-Za-z0-9_-]{59}");
        assertThat(service.resolve(user, token)).isSameAs(post);
        verify(notices, times(2)).getPost(4L, 42L);
    }

    @Test
    void rejectsTokensFromAnotherTenantBeforeLoadingTheNotice() throws Exception {
        String token = service.issue(user, 42L);
        user.setTenantId(5L);

        assertNotFound(() -> service.resolve(user, token));
        verify(notices, times(1)).getPost(4L, 42L);
    }

    @Test
    void rejectsMissingUsersAndUnavailableNotices() throws Exception {
        assertThatThrownBy(() -> service.issue(null, 42L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));

        when(notices.getPost(4L, 99L)).thenThrow(
                new ResponseStatusException(HttpStatus.NOT_FOUND, "not found"));
        assertNotFound(() -> service.issue(user, 99L));
    }

    @Test
    void rejectsNoticeTokensUnderTheDocumentDomain() throws Exception {
        String token = service.issue(user, 42L);

        assertThatThrownBy(() -> tokens.resolve(ShareTokenCodec.ContentType.DOCUMENT, token))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    private void assertNotFound(org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
