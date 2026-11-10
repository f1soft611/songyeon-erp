package egovframework.let.groupware.notification.domain.model;

import java.util.List;

public class NotificationPageVO {

    private final List<NotificationVO> resultList;
    private final boolean hasNext;
    private final Long nextBeforeNotificationId;

    public NotificationPageVO(List<NotificationVO> resultList, boolean hasNext, Long nextBeforeNotificationId) {
        this.resultList = resultList;
        this.hasNext = hasNext;
        this.nextBeforeNotificationId = nextBeforeNotificationId;
    }

    public List<NotificationVO> getResultList() { return resultList; }
    public boolean isHasNext() { return hasNext; }
    public Long getNextBeforeNotificationId() { return nextBeforeNotificationId; }
}
