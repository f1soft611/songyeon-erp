package egovframework.let.groupware.community.notice.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;

@Service
public class NoticeLoginPopupService {
    private final NoticeBoardDAO dao;
    private final NoticeBoardService posts;
    private final Clock clock;

    @Autowired
    public NoticeLoginPopupService(NoticeBoardDAO dao, NoticeBoardService posts) {
        this(dao, posts, Clock.system(ZoneId.of("Asia/Seoul")));
    }

    public NoticeLoginPopupService(NoticeBoardDAO dao, NoticeBoardService posts, Clock clock) {
        this.dao = dao;
        this.posts = posts;
        this.clock = clock;
    }

    public List<NoticeBoardPostVO> list(Long tenantId, String loginCode) throws Exception {
        return dao.selectLoginPopupList(params(tenantId, loginCode, null));
    }

    @Transactional(rollbackFor = Exception.class)
    public NoticeBoardPostVO detail(Long tenantId, Long postId, String loginCode) throws Exception {
        if (dao.selectLoginPopupById(params(tenantId, loginCode, postId)) == null) {
            throw unavailable();
        }
        return posts.getPost(tenantId, postId, loginCode);
    }

    public void dismissToday(Long tenantId, Long postId, String loginCode) throws Exception {
        if (dao.dismissLoginPopup(params(tenantId, loginCode, postId)) == 0) {
            throw unavailable();
        }
    }

    private Map<String, Object> params(Long tenantId, String loginCode, Long postId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("loginCode", loginCode);
        Long loginId = dao.selectLoginIdByLoginCode(params);
        if (loginId == null) {
            throw new IllegalStateException("인증된 로그인 계정을 찾을 수 없습니다.");
        }
        params.put("loginId", loginId);
        params.put("postId", postId);
        params.put("today", LocalDate.now(clock).toString());
        return params;
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "표시 가능한 로그인 공지가 아닙니다.");
    }
}
