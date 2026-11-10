package egovframework.let.groupware.message.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.message.domain.model.DirectMessageCreateRequestVO;
import egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO;
import egovframework.let.groupware.message.domain.model.DirectMessagePageVO;
import egovframework.let.groupware.message.domain.model.DirectMessageVO;

public interface DirectMessageService {
    Long unreadCount(LoginVO user) throws Exception;
    Long resolveThreadIdForNotification(LoginVO user, Long messageId) throws Exception;
    DirectMessagePageVO listThreads(LoginVO user, String folder, Integer limit,
            LocalDateTime beforeUpdatedAt, Long beforeThreadId) throws Exception;
    DirectMessageVO createThread(LoginVO user, DirectMessageCreateRequestVO request) throws Exception;
    DirectMessageDayPageVO getThread(LoginVO user, Long threadId, LocalDate beforeDate) throws Exception;
    void markThreadRead(LoginVO user, Long threadId) throws Exception;

    void hideThread(LoginVO user, Long threadId) throws Exception;
    DirectMessageVO reply(LoginVO user, Long threadId, String content) throws Exception;
}
