package egovframework.let.groupware.message.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.message.domain.model.DirectMessageCreateRequestVO;
import egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO;
import egovframework.let.groupware.message.domain.model.DirectMessagePageVO;
import egovframework.let.groupware.message.domain.model.DirectMessageVO;
import egovframework.let.groupware.message.domain.repository.DirectMessageDAO;
import egovframework.let.groupware.message.service.DirectMessageService;
import egovframework.let.groupware.notification.service.NotificationService;
import egovframework.let.groupware.realtime.RealtimeArea;
import egovframework.let.groupware.realtime.RealtimePublisher;

// 그룹웨어 1:1 쪽지(S_ERP 2026-10-30 쪽지함 · 2026-11-02 실시간과 같은 규칙). 송연은 사람을 사번 문자열로 가리킨다(20261103_003)
@Service("directMessageService")
public class DirectMessageServiceImpl implements DirectMessageService {

    private final DirectMessageDAO messageDAO;
    private final NotificationService notificationService;
    private final RealtimePublisher realtime;

    public DirectMessageServiceImpl(DirectMessageDAO messageDAO, NotificationService notificationService,
            RealtimePublisher realtime) {
        this.messageDAO = messageDAO;
        this.notificationService = notificationService;
        this.realtime = realtime;
    }

    @Override
    @Transactional(readOnly = true)
    public Long unreadCount(LoginVO user) throws Exception {
        Long count = messageDAO.selectUnreadCount(ownerParams(user));
        if (count == null) {
            throw new IllegalStateException("미읽음 쪽지 수 조회 결과가 없습니다.");
        }
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public Long resolveThreadIdForNotification(LoginVO user, Long messageId) throws Exception {
        if (messageId == null || messageId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쪽지 ID가 올바르지 않습니다.");
        }
        Map<String, Object> params = ownerParams(user);
        params.put("messageId", messageId);
        Long threadId = messageDAO.selectThreadIdForMessage(params);
        if (threadId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "쪽지를 찾을 수 없습니다.");
        }
        return threadId;
    }

    @Override
    @Transactional(readOnly = true)
    public DirectMessagePageVO listThreads(LoginVO user, String folder, Integer limit,
            LocalDateTime beforeUpdatedAt, Long beforeThreadId) throws Exception {
        Map<String, Object> params = ownerParams(user);
        String normalizedFolder = folder == null ? "ALL" : folder;
        int safeLimit = limit == null ? 20 : limit;
        if (!"ALL".equals(normalizedFolder) && !"INBOX".equals(normalizedFolder) && !"SENT".equals(normalizedFolder)
                || safeLimit < 1 || safeLimit > 50
                || (beforeUpdatedAt == null) != (beforeThreadId == null)
                || (beforeThreadId != null && beforeThreadId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쪽지함 조회 조건이 올바르지 않습니다.");
        }
        params.put("folder", normalizedFolder);
        params.put("limit", safeLimit + 1);
        params.put("beforeUpdatedAt", beforeUpdatedAt);
        params.put("beforeThreadId", beforeThreadId);
        List<DirectMessageVO> items = messageDAO.selectThreads(params);
        if (items == null) {
            throw new IllegalStateException("쪽지 대화 목록 조회 결과가 없습니다.");
        }
        boolean hasNext = items.size() > safeLimit;
        if (hasNext) {
            items = new ArrayList<>(items.subList(0, safeLimit));
        }
        DirectMessageVO last = hasNext ? items.get(items.size() - 1) : null;
        return new DirectMessagePageVO(items, hasNext,
                last == null ? null : last.getUpdatedAt(), last == null ? null : last.getThreadId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DirectMessageVO createThread(LoginVO user, DirectMessageCreateRequestVO request) throws Exception {
        Map<String, Object> params = ownerParams(user);
        String senderId = (String) params.get("userId");
        String recipientId = request == null || request.getRecipientUserId() == null
                ? "" : request.getRecipientUserId().trim();
        if (recipientId.isEmpty() || recipientId.length() > 20 || recipientId.equals(senderId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쪽지 수신자가 올바르지 않습니다.");
        }
        String content = validateContent(request.getContent());
        String subject = validateSubject(request.getSubject());
        params.put("recipientUserId", recipientId);
        if (!Boolean.TRUE.equals(messageDAO.selectActiveRecipient(params))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "활성 상태의 같은 테넌트 사용자만 수신자로 선택할 수 있습니다.");
        }
        // 두 사람 순서 a < b(사번 글자 순서, 표 제약과 같은 기준)
        boolean senderFirst = senderId.compareTo(recipientId) < 0;
        params.put("participantAUserId", senderFirst ? senderId : recipientId);
        params.put("participantBUserId", senderFirst ? recipientId : senderId);
        params.put("subject", subject);
        Long threadId = messageDAO.insertThread(params);
        if (threadId == null) {
            throw new IllegalStateException("쪽지 대화 ID를 확인할 수 없습니다.");
        }
        return saveMessage(params, threadId, senderId, recipientId, content, subject);
    }

    @Override
    @Transactional(readOnly = true)
    public DirectMessageDayPageVO getThread(LoginVO user, Long threadId, LocalDate beforeDate) throws Exception {
        Map<String, Object> params = ownerParams(user);
        params.put("threadId", requireThreadId(threadId));
        DirectMessageVO thread = messageDAO.selectThreadForParticipant(params);
        if (thread == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "쪽지 대화를 찾을 수 없습니다.");
        }
        params.put("visibleAfter", thread.getHiddenAt());
        params.put("beforeDayStart", beforeDate == null ? null : beforeDate.atStartOfDay());
        LocalDate messageDate = messageDAO.selectLatestMessageDate(params);
        if (messageDate == null) {
            return new DirectMessageDayPageVO(new ArrayList<>(), null, false);
        }
        params.put("dayStart", messageDate.atStartOfDay());
        params.put("dayEnd", messageDate.plusDays(1).atStartOfDay());
        List<DirectMessageVO> messages = messageDAO.selectThreadMessages(params);
        if (messages == null) {
            throw new IllegalStateException("쪽지 대화 메시지 조회 결과가 없습니다.");
        }
        boolean hasPrevious = Boolean.TRUE.equals(messageDAO.selectHasMessagesBefore(params));
        return new DirectMessageDayPageVO(messages, messageDate, hasPrevious);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markThreadRead(LoginVO user, Long threadId) throws Exception {
        Map<String, Object> params = ownerParams(user);
        params.put("threadId", requireThreadId(threadId));
        DirectMessageVO thread = messageDAO.selectThreadForParticipant(params);
        if (thread == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "쪽지 대화를 찾을 수 없습니다.");
        }
        publishReadChanges(params, thread);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void hideThread(LoginVO user, Long threadId) throws Exception {
        Map<String, Object> params = ownerParams(user);
        params.put("threadId", requireThreadId(threadId));
        DirectMessageVO thread = messageDAO.selectThreadForParticipant(params);
        if (thread == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "쪽지 대화를 찾을 수 없습니다.");
        }
        if (messageDAO.hideThreadForParticipant(params) != 1) {
            throw new IllegalStateException("쪽지 대화를 삭제할 수 없습니다.");
        }
        publishReadChanges(params, thread);
        realtime.publish((Long) params.get("tenantId"), (String) params.get("userId"), RealtimeArea.MESSAGE);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DirectMessageVO reply(LoginVO user, Long threadId, String rawContent) throws Exception {
        Map<String, Object> params = ownerParams(user);
        String senderId = (String) params.get("userId");
        params.put("threadId", requireThreadId(threadId));
        DirectMessageVO thread = messageDAO.selectThreadForParticipant(params);
        if (thread == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "쪽지 대화를 찾을 수 없습니다.");
        }
        String recipientId = thread.getOtherUserId();
        return saveMessage(params, threadId, senderId, recipientId, validateContent(rawContent), thread.getSubject());
    }

    private DirectMessageVO saveMessage(Map<String, Object> params, Long threadId, String senderId,
            String recipientId, String content, String subject) throws Exception {
        params.put("threadId", threadId);
        params.put("senderUserId", senderId);
        params.put("recipientUserId", recipientId);
        params.put("content", content);
        Long messageId = messageDAO.insertMessage(params);
        if (messageId == null) {
            throw new IllegalStateException("쪽지 ID를 확인할 수 없습니다.");
        }
        if (messageDAO.updateThreadUpdatedAt(params) != 1) {
            throw new IllegalStateException("쪽지 대화의 최신 시각을 갱신할 수 없습니다.");
        }
        int summaryEnd = Math.min(content.length(), 497);
        if (summaryEnd < content.length() && Character.isHighSurrogate(content.charAt(summaryEnd - 1))
                && Character.isLowSurrogate(content.charAt(summaryEnd))) {
            summaryEnd--;
        }
        String summary = content.length() > 497 ? content.substring(0, summaryEnd) + "..." : content;
        notificationService.createEvent((Long) params.get("tenantId"), recipientId,
                "DIRECT_MESSAGE_RECEIVED", "DIRECT_MESSAGE", messageId, "새 쪽지가 도착했습니다.", summary);
        realtime.publish((Long) params.get("tenantId"), senderId, RealtimeArea.MESSAGE);
        DirectMessageVO message = new DirectMessageVO();
        message.setThreadId(threadId);
        message.setMessageId(messageId);
        message.setSenderUserId(senderId);
        message.setRecipientUserId(recipientId);
        message.setSubject(subject);
        message.setContent(content);
        return message;
    }

    private void publishReadChanges(Map<String, Object> params, DirectMessageVO thread) throws Exception {
        int messagesChanged = messageDAO.markThreadMessagesRead(params);
        int notificationsChanged = messageDAO.markThreadNotificationsRead(params);
        Long tenantId = (Long) params.get("tenantId");
        String userId = (String) params.get("userId");
        if (notificationsChanged > 0) {
            realtime.publish(tenantId, userId, RealtimeArea.NOTIFICATION);
        }
        if (messagesChanged > 0) {
            realtime.publish(tenantId, userId, RealtimeArea.MESSAGE);
            realtime.publish(tenantId, thread.getOtherUserId(), RealtimeArea.MESSAGE);
        }
    }

    private static String validateContent(String content) {
        if (!StringUtils.hasText(content) || content.trim().length() > 5000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쪽지 본문은 1자 이상 5,000자 이하여야 합니다.");
        }
        return content.trim();
    }

    private static String validateSubject(String subject) {
        if (subject == null || subject.trim().isEmpty()) {
            return null;
        }
        if (subject.trim().length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쪽지 제목은 120자 이하여야 합니다.");
        }
        return subject.trim();
    }

    private static long requireThreadId(Long threadId) {
        if (threadId == null || threadId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "쪽지 대화 ID가 올바르지 않습니다.");
        }
        return threadId;
    }

    private static Map<String, Object> ownerParams(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                || !StringUtils.hasText(user.getUniqId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("userId", user.getUniqId().trim());
        return params;
    }
}
