package egovframework.let.groupware.message.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.message.domain.model.DirectMessageCreateRequestVO;
import egovframework.let.groupware.message.domain.repository.DirectMessageDAO;
import egovframework.let.groupware.notification.service.NotificationService;
import egovframework.let.groupware.message.domain.model.DirectMessageVO;
import egovframework.let.groupware.realtime.RealtimePublisher;
import egovframework.let.groupware.realtime.RealtimeArea;

// S_ERP DirectMessageServiceImplTest(2026-10-30 쪽지함 · 2026-11-02 실시간)와 같은 확인. 송연은 사람을 사번 문자열로 가리킨다(20261103_003)
class DirectMessageServiceImplTest {

    private final DirectMessageDAO messageDAO = mock(DirectMessageDAO.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final RealtimePublisher realtime = mock(RealtimePublisher.class);
    private final DirectMessageServiceImpl service =
            new DirectMessageServiceImpl(messageDAO, notificationService, realtime);

    @Test
    void changedReadSignalsOwnNotificationAndBothMessageOwnersOnlyOnce() throws Exception {
        DirectMessageVO thread = new DirectMessageVO();
        thread.setOtherUserId("22");
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.markThreadMessagesRead(anyMap())).thenReturn(2, 0);
        when(messageDAO.markThreadNotificationsRead(anyMap())).thenReturn(2, 0);
        service.markThreadRead(authenticatedUser(), 65L);
        service.markThreadRead(authenticatedUser(), 65L);
        verify(realtime).publish(4L, "11", RealtimeArea.NOTIFICATION);
        verify(realtime).publish(4L, "11", RealtimeArea.MESSAGE);
        verify(realtime).publish(4L, "22", RealtimeArea.MESSAGE);
    }

    @Test
    void repeatedReadWithoutChangesDoesNotSignal() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new DirectMessageVO());
        service.markThreadRead(authenticatedUser(), 65L);
        org.mockito.Mockito.verifyNoInteractions(realtime);
    }

    @Test
    void notificationOnlyReadDoesNotInventMessageChanges() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new DirectMessageVO());
        when(messageDAO.markThreadNotificationsRead(anyMap())).thenReturn(1);
        service.markThreadRead(authenticatedUser(), 65L);
        verify(realtime).publish(4L, "11", RealtimeArea.NOTIFICATION);
        verify(realtime, never()).publish(4L, "11", RealtimeArea.MESSAGE);
    }

    @Test
    void replySignalsSenderAndUsesNotificationForRecipientSignal() throws Exception {
        DirectMessageVO thread = new DirectMessageVO();
        thread.setOtherUserId("22");
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.insertMessage(anyMap())).thenReturn(102L);
        when(messageDAO.updateThreadUpdatedAt(anyMap())).thenReturn(1);
        service.reply(authenticatedUser(), 65L, "Reply");
        verify(realtime).publish(4L, "11", RealtimeArea.MESSAGE);
        verify(notificationService).createEvent(4L, "22", "DIRECT_MESSAGE_RECEIVED",
                "DIRECT_MESSAGE", 102L, "새 쪽지가 도착했습니다.", "Reply");
    }

    @Test
    void notificationPreviewDoesNotSplitEmojiAtTruncationBoundary() throws Exception {
        DirectMessageVO thread = new DirectMessageVO();
        thread.setOtherUserId("22");
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.insertMessage(anyMap())).thenReturn(102L);
        when(messageDAO.updateThreadUpdatedAt(anyMap())).thenReturn(1);
        String prefix = "x".repeat(496);
        String content = prefix + "\ud83d\ude00tail";
        DirectMessageVO result = service.reply(authenticatedUser(), 65L, content);
        org.junit.jupiter.api.Assertions.assertEquals(content, result.getContent());
        verify(notificationService).createEvent(4L, "22", "DIRECT_MESSAGE_RECEIVED",
                "DIRECT_MESSAGE", 102L, "새 쪽지가 도착했습니다.", prefix + "...");
    }

    @Test
    void failedMessageWriteDoesNotScheduleSignals() throws Exception {
        DirectMessageVO thread = new DirectMessageVO();
        thread.setOtherUserId("22");
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.insertMessage(anyMap())).thenReturn(102L);
        when(messageDAO.updateThreadUpdatedAt(anyMap())).thenReturn(0);
        assertThatThrownBy(() -> service.reply(authenticatedUser(), 65L, "Reply"))
                .isInstanceOf(IllegalStateException.class);
        org.mockito.Mockito.verifyNoInteractions(realtime, notificationService);
    }

    @Test
    void hideAlsoSignalsNotificationAndCounterpartWhenReadStateChanged() throws Exception {
        DirectMessageVO thread = new DirectMessageVO();
        thread.setOtherUserId("22");
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.hideThreadForParticipant(anyMap())).thenReturn(1);
        when(messageDAO.markThreadMessagesRead(anyMap())).thenReturn(1);
        when(messageDAO.markThreadNotificationsRead(anyMap())).thenReturn(1);
        service.hideThread(authenticatedUser(), 65L);
        verify(realtime).publish(4L, "11", RealtimeArea.NOTIFICATION);
        verify(realtime).publish(4L, "22", RealtimeArea.MESSAGE);
    }

    @Test
    void rejectsBlankOrOverlongMessageBeforeDatabaseAccess() throws Exception {
        assertBadRequest(() -> service.createThread(authenticatedUser(), request("22", "   ")));
        assertBadRequest(() -> service.createThread(authenticatedUser(), request("22", "x".repeat(5001))));

        verify(messageDAO, never()).insertThread(anyMap());
        verify(notificationService, never()).createEvent(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void rejectsSendingMessageToSelfBeforeDatabaseAccess() throws Exception {
        assertBadRequest(() -> service.createThread(authenticatedUser(), request("11", "안녕하세요")));

        verify(messageDAO, never()).selectActiveRecipient(anyMap());
    }

    @Test
    void createsThreadMessageAndRecipientNotificationTogether() throws Exception {
        when(messageDAO.selectActiveRecipient(anyMap())).thenReturn(true);
        when(messageDAO.insertThread(anyMap())).thenReturn(65L);
        when(messageDAO.insertMessage(anyMap())).thenReturn(101L);
        when(messageDAO.updateThreadUpdatedAt(anyMap())).thenReturn(1);

        service.createThread(authenticatedUser(), request("22", "안녕하세요"));

        verify(messageDAO).insertMessage(argThat(params ->
                Long.valueOf(65L).equals(params.get("threadId"))
                        && "11".equals(params.get("senderUserId"))
                        && "22".equals(params.get("recipientUserId"))
                        && "안녕하세요".equals(params.get("content"))));
        verify(notificationService).createEvent(4L, "22", "DIRECT_MESSAGE_RECEIVED",
                "DIRECT_MESSAGE", 101L, "새 쪽지가 도착했습니다.", "안녕하세요");
        verify(realtime).publish(4L, "11", RealtimeArea.MESSAGE);
    }

    @Test
    void loadsLatestMessageDayFirstAndReportsOlderDays() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(java.time.LocalDate.of(2026, 10, 30));
        when(messageDAO.selectThreadMessages(anyMap())).thenReturn(java.util.Collections.emptyList());
        when(messageDAO.selectHasMessagesBefore(anyMap())).thenReturn(true);

        egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO page =
                service.getThread(authenticatedUser(), 65L, null);

        org.assertj.core.api.Assertions.assertThat(page.getMessageDate()).isEqualTo(java.time.LocalDate.of(2026, 10, 30));
        org.assertj.core.api.Assertions.assertThat(page.isHasPrevious()).isTrue();
        verify(messageDAO).selectLatestMessageDate(argThat(params -> params.get("beforeDayStart") == null));
        verify(messageDAO).selectThreadMessages(argThat(params ->
                java.time.LocalDateTime.of(2026, 10, 30, 0, 0).equals(params.get("dayStart"))
                        && java.time.LocalDateTime.of(2026, 10, 31, 0, 0).equals(params.get("dayEnd"))));
    }

    @Test
    void loadsPreviousMessageDayBeforeCursorDate() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(java.time.LocalDate.of(2026, 10, 27));
        when(messageDAO.selectThreadMessages(anyMap())).thenReturn(java.util.Collections.emptyList());
        when(messageDAO.selectHasMessagesBefore(anyMap())).thenReturn(false);

        egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO page =
                service.getThread(authenticatedUser(), 65L, java.time.LocalDate.of(2026, 10, 30));

        org.assertj.core.api.Assertions.assertThat(page.getMessageDate()).isEqualTo(java.time.LocalDate.of(2026, 10, 27));
        org.assertj.core.api.Assertions.assertThat(page.isHasPrevious()).isFalse();
        verify(messageDAO).selectLatestMessageDate(argThat(params ->
                java.time.LocalDateTime.of(2026, 10, 30, 0, 0).equals(params.get("beforeDayStart"))));
    }

    @Test
    void returnsEmptyDayPageWhenNoOlderMessagesExist() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(null);

        egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO page =
                service.getThread(authenticatedUser(), 65L, java.time.LocalDate.of(2026, 10, 1));

        org.assertj.core.api.Assertions.assertThat(page.getResultList()).isEmpty();
        org.assertj.core.api.Assertions.assertThat(page.isHasPrevious()).isFalse();
        verify(messageDAO, never()).selectThreadMessages(anyMap());
    }

    @Test
    void onlyShowsMessagesAfterTheUsersHiddenAt() throws Exception {
        egovframework.let.groupware.message.domain.model.DirectMessageVO thread =
                new egovframework.let.groupware.message.domain.model.DirectMessageVO();
        java.time.LocalDateTime hiddenAt = java.time.LocalDateTime.of(2026, 10, 29, 9, 0);
        thread.setHiddenAt(hiddenAt);
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(thread);
        when(messageDAO.selectLatestMessageDate(anyMap())).thenReturn(java.time.LocalDate.of(2026, 10, 30));
        when(messageDAO.selectThreadMessages(anyMap())).thenReturn(java.util.Collections.emptyList());
        when(messageDAO.selectHasMessagesBefore(anyMap())).thenReturn(false);

        service.getThread(authenticatedUser(), 65L, null);

        verify(messageDAO).selectThreadMessages(argThat(params -> hiddenAt.equals(params.get("visibleAfter"))));
        verify(messageDAO).selectHasMessagesBefore(argThat(params -> hiddenAt.equals(params.get("visibleAfter"))));
    }

    @Test
    void hidesThreadOnlyForCurrentUserAndMarksItRead() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(new egovframework.let.groupware.message.domain.model.DirectMessageVO());
        when(messageDAO.hideThreadForParticipant(anyMap())).thenReturn(1);

        service.hideThread(authenticatedUser(), 65L);
        verify(realtime).publish(4L, "11", RealtimeArea.MESSAGE);

        verify(messageDAO).hideThreadForParticipant(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "11".equals(params.get("userId"))
                        && Long.valueOf(65L).equals(params.get("threadId"))));
        verify(messageDAO).markThreadMessagesRead(anyMap());
        verify(messageDAO).markThreadNotificationsRead(anyMap());
    }

    @Test
    void doesNotHideThreadOfOtherUsers() throws Exception {
        when(messageDAO.selectThreadForParticipant(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.hideThread(authenticatedUser(), 65L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
        verify(messageDAO, never()).hideThreadForParticipant(anyMap());
    }

    @Test
    void listsAllConversationsWhenFolderIsAll() throws Exception {
        when(messageDAO.selectThreads(anyMap())).thenReturn(new java.util.ArrayList<>());

        service.listThreads(authenticatedUser(), "ALL", null, null, null);

        verify(messageDAO).selectThreads(argThat(params -> "ALL".equals(params.get("folder"))));
    }

    @Test
    void resolvesNotificationMessageOnlyInsideAnAuthorizedThread() throws Exception {
        when(messageDAO.selectThreadIdForMessage(anyMap())).thenReturn(65L);

        org.assertj.core.api.Assertions.assertThat(
                service.resolveThreadIdForNotification(authenticatedUser(), 101L)).isEqualTo(65L);
        verify(messageDAO).selectThreadIdForMessage(argThat(params ->
                Long.valueOf(4L).equals(params.get("tenantId"))
                        && "11".equals(params.get("userId"))
                        && Long.valueOf(101L).equals(params.get("messageId"))));
    }

    @Test
    void doesNotResolveNotificationMessageOutsideTheUsersThreads() throws Exception {
        when(messageDAO.selectThreadIdForMessage(anyMap())).thenReturn(null);

        assertThatThrownBy(() -> service.resolveThreadIdForNotification(authenticatedUser(), 101L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatus())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    // 송연: 사번 문자열이라 대화방 참여자 a < b 는 글자 순서로 정한다(표 제약 participant_a_user_id < participant_b_user_id 와 같은 기준)
    @Test
    void ordersThreadParticipantsBy사번Text() throws Exception {
        when(messageDAO.selectActiveRecipient(anyMap())).thenReturn(true);
        when(messageDAO.insertThread(anyMap())).thenReturn(65L);
        when(messageDAO.insertMessage(anyMap())).thenReturn(101L);
        when(messageDAO.updateThreadUpdatedAt(anyMap())).thenReturn(1);

        service.createThread(authenticatedUser(), request("100", "안녕하세요"));

        verify(messageDAO).insertThread(argThat(params ->
                "100".equals(params.get("participantAUserId")) && "11".equals(params.get("participantBUserId"))));
    }

    @Test
    void rejectsBlankRecipient() throws Exception {
        assertBadRequest(() -> service.createThread(authenticatedUser(), request(" ", "안녕하세요")));
        verify(messageDAO, never()).selectActiveRecipient(anyMap());
    }

    private static LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("11");
        return user;
    }

    private static DirectMessageCreateRequestVO request(String recipientId, String content) {
        DirectMessageCreateRequestVO request = new DirectMessageCreateRequestVO();
        request.setRecipientUserId(recipientId);
        request.setContent(content);
        return request;
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
