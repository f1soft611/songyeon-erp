package egovframework.let.groupware.notification.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.model.NotificationPageVO;
import egovframework.let.groupware.notification.domain.model.NotificationVO;

public interface NotificationService {

    // 송연: 받는 사람은 사번(employees.id) 문자열이다(20261103_003)
    void createEvent(Long tenantId, String recipientUserId, String eventType, String sourceType,
            Long sourceId, String title, String summary) throws Exception;

    Long unreadCount(LoginVO user) throws Exception;

    NotificationPageVO list(LoginVO user, Integer limit, Long beforeNotificationId, Boolean unreadOnly,
            String eventType)
            throws Exception;

    void archiveNotification(LoginVO user, Long notificationId) throws Exception;

    int archiveReadNotifications(LoginVO user, String eventType) throws Exception;

    NotificationVO markRead(LoginVO user, Long notificationId) throws Exception;
}
