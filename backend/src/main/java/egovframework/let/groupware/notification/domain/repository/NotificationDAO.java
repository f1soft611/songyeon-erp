package egovframework.let.groupware.notification.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.notification.domain.model.NotificationVO;

@Repository("notificationDAO")
public class NotificationDAO extends EgovAbstractMapper {

    public Long selectUnreadCount(Map<String, Object> params) throws Exception {
        return selectOne("NotificationDAO.selectUnreadCount", params);
    }

    public List<NotificationVO> selectNotifications(Map<String, Object> params) throws Exception {
        return selectList("NotificationDAO.selectNotifications", params);
    }

    public NotificationVO selectOwnedNotification(Map<String, Object> params) throws Exception {
        return selectOne("NotificationDAO.selectOwnedNotification", params);
    }

    public int updateNotificationReadAt(Map<String, Object> params) throws Exception {
        return update("NotificationDAO.updateNotificationReadAt", params);
    }

    public int archiveNotification(Map<String, Object> params) throws Exception {
        return update("NotificationDAO.archiveNotification", params);
    }

    public int archiveReadNotifications(Map<String, Object> params) throws Exception {
        return update("NotificationDAO.archiveReadNotifications", params);
    }

    public int insertNotification(Map<String, Object> params) throws Exception {
        return insert("NotificationDAO.insertNotification", params);
    }
}
