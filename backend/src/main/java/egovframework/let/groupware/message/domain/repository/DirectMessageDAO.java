package egovframework.let.groupware.message.domain.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;
import egovframework.let.groupware.message.domain.model.DirectMessageVO;

@Repository("directMessageDAO")
public class DirectMessageDAO extends EgovAbstractMapper {

    public Long selectUnreadCount(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.selectUnreadCount", params);
    }

    public Boolean selectActiveRecipient(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.selectActiveRecipient", params);
    }

    public Long selectThreadIdForMessage(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.selectThreadIdForMessage", params);
    }

    public Long insertThread(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.insertThread", params);
    }

    public Long insertMessage(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.insertMessage", params);
    }

    public int updateThreadUpdatedAt(Map<String, Object> params) throws Exception {
        return update("DirectMessageDAO.updateThreadUpdatedAt", params);
    }

    public DirectMessageVO selectThreadForParticipant(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.selectThreadForParticipant", params);
    }

    public List<DirectMessageVO> selectThreads(Map<String, Object> params) throws Exception {
        return selectList("DirectMessageDAO.selectThreads", params);
    }

    public List<DirectMessageVO> selectThreadMessages(Map<String, Object> params) throws Exception {
        return selectList("DirectMessageDAO.selectThreadMessages", params);
    }

    public LocalDate selectLatestMessageDate(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.selectLatestMessageDate", params);
    }

    public Boolean selectHasMessagesBefore(Map<String, Object> params) throws Exception {
        return selectOne("DirectMessageDAO.selectHasMessagesBefore", params);
    }

    public int hideThreadForParticipant(Map<String, Object> params) throws Exception {
        return update("DirectMessageDAO.hideThreadForParticipant", params);
    }

    public int markThreadMessagesRead(Map<String, Object> params) throws Exception {
        return update("DirectMessageDAO.markThreadMessagesRead", params);
    }

    public int markThreadNotificationsRead(Map<String, Object> params) throws Exception {
        return update("DirectMessageDAO.markThreadNotificationsRead", params);
    }
}
