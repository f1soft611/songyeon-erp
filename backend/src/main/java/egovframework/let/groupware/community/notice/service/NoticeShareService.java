package egovframework.let.groupware.community.notice.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.shared.service.ShareTokenCodec;
import egovframework.let.groupware.shared.service.ShareTokenCodec.ContentType;
import egovframework.let.groupware.shared.service.ShareTokenCodec.ShareReference;

@Service
public class NoticeShareService {
    private static final long MAX_SAFE_ID = 9_007_199_254_740_991L;

    private final NoticeBoardService notices;
    private final ShareTokenCodec tokens;

    public NoticeShareService(NoticeBoardService notices, ShareTokenCodec tokens) {
        this.notices = notices;
        this.tokens = tokens;
    }

    public String issue(LoginVO user, Long postId) throws Exception {
        requireAuthenticated(user);
        requireValidId(postId);
        NoticeBoardPostVO post = notices.getPost(user.getTenantId(), postId);
        if (!isAvailable(post, postId)) {
            throw unavailable();
        }
        return tokens.issue(ContentType.NOTICE, user.getTenantId(), postId);
    }

    public NoticeBoardPostVO resolve(LoginVO user, String token) throws Exception {
        requireAuthenticated(user);
        ShareReference reference = tokens.resolve(ContentType.NOTICE, token);
        if (reference.getTenantId() != user.getTenantId()
                || reference.getContentId() > MAX_SAFE_ID) {
            throw unavailable();
        }
        NoticeBoardPostVO post = notices.getPost(user.getTenantId(), reference.getContentId());
        if (!isAvailable(post, reference.getContentId())) {
            throw unavailable();
        }
        return post;
    }

    private static boolean isAvailable(NoticeBoardPostVO post, Long postId) {
        return post != null && postId.equals(post.getPostId())
                && !"Y".equalsIgnoreCase(post.getIsDeleted());
    }

    private static void requireValidId(Long postId) {
        if (postId == null || postId <= 0 || postId > MAX_SAFE_ID) {
            throw unavailable();
        }
    }

    private static void requireAuthenticated(LoginVO user) {
        if (user == null || user.getId() == null || user.getId().trim().isEmpty()
                || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "접근할 수 없거나 삭제된 공지입니다.");
    }
}
