package egovframework.let.groupware.notification.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.repository.NotificationDAO;
import egovframework.let.groupware.notification.domain.model.NotificationVO;
import egovframework.let.groupware.realtime.RealtimeArea;
import egovframework.let.groupware.realtime.RealtimePublisher;

// S_ERP NotificationServiceImplTest(2026-10-30 알림함)와 같은 확인. 송연은 사람을 사번 문자열로 가리킨다(20261103_003).
// 웹푸시 확인은 웹푸시 단계에서 넣는다. 실시간 신호 확인은 2026-11-04 3단계에서 넣었다
class NotificationServiceImplTest {

    private final NotificationDAO notificationDAO = mock(NotificationDAO.class);
    private final RealtimePublisher realtime = mock(RealtimePublisher.class);
    private final NotificationServiceImpl service = new NotificationServiceImpl(notificationDAO, realtime);

    @Test
    void onlyInsertedEventsSignalOwnerAndDirectMessageArea() throws Exception {
        when(notificationDAO.insertNotification(anyMap())).thenReturn(1, 0);
        service.createEvent(4L, "E0019", "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE", 72L, "Title", "Summary");
        service.createEvent(4L, "E0019", "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE", 72L, "Title", "Summary");
        verify(realtime).publish(4L, "E0019", RealtimeArea.NOTIFICATION);
        verify(realtime).publish(4L, "E0019", RealtimeArea.MESSAGE);
    }

    @Test
    void readSignalsOnlyForActualRowChanges() throws Exception {
        NotificationVO unread = new NotificationVO();
        NotificationVO read = new NotificationVO();
        read.setReadAt(java.time.LocalDateTime.now());
        when(notificationDAO.selectOwnedNotification(anyMap())).thenReturn(unread, read, read);
        when(notificationDAO.updateNotificationReadAt(anyMap())).thenReturn(1);
        service.markRead(authenticatedUser(), 73L);
        service.markRead(authenticatedUser(), 73L);
        verify(realtime).publish(4L, "E0012", RealtimeArea.NOTIFICATION);
    }

    @Test
    void concurrentReadWithNoChangedRowsDoesNotSignal() throws Exception {
        when(notificationDAO.selectOwnedNotification(anyMap())).thenReturn(new NotificationVO());
        when(notificationDAO.updateNotificationReadAt(anyMap())).thenReturn(0);
        service.markRead(authenticatedUser(), 73L);
        org.mockito.Mockito.verifyNoInteractions(realtime);
    }

    @Test
    void emptyBulkArchiveDoesNotSignal() throws Exception {
        service.archiveReadNotifications(authenticatedUser(), null);
        org.mockito.Mockito.verifyNoInteractions(realtime);
    }

    @Test
    void createsOnlySupportedNotificationEventAndTrimsDisplayText() throws Exception {
        service.createEvent(4L, "E0019", "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE",
                72L, " New message ", " Preview ");

        verify(notificationDAO).insertNotification(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "E0019".equals(params.get("recipientUserId"))
                        && "DIRECT_MESSAGE_RECEIVED".equals(params.get("eventType"))
                        && "DIRECT_MESSAGE".equals(params.get("sourceType"))
                        && Long.valueOf(72L).equals(params.get("sourceId"))
                        && "New message".equals(params.get("title"))
                        && "Preview".equals(params.get("summary"))));
    }

    @Test
    void acceptsApprovalCommentMention() throws Exception {
        service.createEvent(4L, " E0019 ", "APPROVAL_COMMENT_MENTION", "APPROVAL_COMMENT",
                75L, "Title", "Summary");

        verify(notificationDAO).insertNotification(argThat(params ->
                "E0019".equals(params.get("recipientUserId"))
                        && "APPROVAL_COMMENT_MENTION".equals(params.get("eventType"))));
    }

    @Test
    void rejectsMismatchedNotificationSourceAndEvent() throws Exception {
        assertBadRequest(() -> service.createEvent(4L, "E0019", "DIRECT_MESSAGE_RECEIVED",
                "APPROVAL_COMMENT", 72L, "New message", "Preview"));
        verify(notificationDAO, never()).insertNotification(anyMap());
    }

    @Test
    void rejectsBlankRecipientOrTooLongText() throws Exception {
        assertBadRequest(() -> service.createEvent(4L, " ", "APPROVAL_COMMENT_MENTION",
                "APPROVAL_COMMENT", 72L, "Title", "Summary"));
        assertBadRequest(() -> service.createEvent(4L, "E0019", "APPROVAL_COMMENT_MENTION",
                "APPROVAL_COMMENT", 72L, "x".repeat(201), "Summary"));
        assertBadRequest(() -> service.createEvent(4L, "E0019", "APPROVAL_COMMENT_MENTION",
                "APPROVAL_COMMENT", 72L, "Title", "x".repeat(501)));
        verify(notificationDAO, never()).insertNotification(anyMap());
    }

    @Test
    void rejectsPageLimitsOutsideOneToFiftyBeforeQuerying() throws Exception {
        assertBadRequest(() -> service.list(authenticatedUser(), 0, null, false, null));
        assertBadRequest(() -> service.list(authenticatedUser(), 51, null, false, null));
        verify(notificationDAO, never()).selectNotifications(anyMap());
    }

    @Test
    void rejectsNonPositiveCursorBeforeQuerying() throws Exception {
        assertBadRequest(() -> service.list(authenticatedUser(), 20, 0L, false, null));
        verify(notificationDAO, never()).selectNotifications(anyMap());
    }

    @Test
    void filtersNotificationsBySupportedEventTypeWithinTheAuthenticatedUserScope() throws Exception {
        when(notificationDAO.selectNotifications(anyMap())).thenReturn(Collections.emptyList());

        service.list(authenticatedUser(), 20, null, true, "DIRECT_MESSAGE_RECEIVED");

        verify(notificationDAO).selectNotifications(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "E0012".equals(params.get("userId"))
                        && Boolean.TRUE.equals(params.get("unreadOnly"))
                        && "DIRECT_MESSAGE_RECEIVED".equals(params.get("eventType"))));
    }

    @Test
    void rejectsUnsupportedEventTypeBeforeQuerying() throws Exception {
        assertBadRequest(() -> service.list(authenticatedUser(), 20, null, false, "UNTRUSTED"));
        verify(notificationDAO, never()).selectNotifications(anyMap());
    }

    @Test
    void archivesOneNotificationOnlyWithinTheAuthenticatedUserScope() throws Exception {
        when(notificationDAO.archiveNotification(anyMap())).thenReturn(1);

        service.archiveNotification(authenticatedUser(), 73L);
        verify(realtime).publish(4L, "E0012", RealtimeArea.NOTIFICATION);

        verify(notificationDAO).archiveNotification(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "E0012".equals(params.get("userId"))
                        && Long.valueOf(73L).equals(params.get("notificationId"))));
    }

    @Test
    void doesNotDiscloseAnotherUsersNotificationWhenArchiving() throws Exception {
        when(notificationDAO.archiveNotification(anyMap())).thenReturn(0);

        assertThatThrownBy(() -> service.archiveNotification(authenticatedUser(), 73L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void archivesReadNotificationsWithinTheSelectedEventType() throws Exception {
        when(notificationDAO.archiveReadNotifications(anyMap())).thenReturn(3);

        int archivedCount = service.archiveReadNotifications(
                authenticatedUser(), "APPROVAL_COMMENT_MENTION");

        org.assertj.core.api.Assertions.assertThat(archivedCount).isEqualTo(3);
        verify(realtime).publish(4L, "E0012", RealtimeArea.NOTIFICATION);
        verify(notificationDAO).archiveReadNotifications(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "E0012".equals(params.get("userId"))
                        && "APPROVAL_COMMENT_MENTION".equals(params.get("eventType"))));
    }

    @Test
    void rejectsUnsupportedArchiveFilterBeforeUpdating() throws Exception {
        assertBadRequest(() -> service.archiveReadNotifications(authenticatedUser(), "UNTRUSTED"));
        verify(notificationDAO, never()).archiveReadNotifications(anyMap());
    }

    @Test
    void doesNotDiscloseAnotherUsersNotification() throws Exception {
        when(notificationDAO.selectOwnedNotification(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.markRead(authenticatedUser(), 73L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
        verify(notificationDAO, never()).updateNotificationReadAt(anyMap());
    }

    @Test
    void rejectsAnonymousUser() throws Exception {
        LoginVO anonymous = new LoginVO();
        assertThatThrownBy(() -> service.unreadCount(anonymous))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("E0012");
        return user;
    }

    private static void assertBadRequest(ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run() throws Exception;
    }
}
