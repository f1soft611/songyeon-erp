package egovframework.let.groupware.community.notice.service;

import java.util.List;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSearchVO;
import egovframework.let.common.dto.ListResult;

public interface NoticeBoardService {
    ListResult<NoticeBoardPostVO> listPosts(NoticeBoardPostSearchVO search) throws Exception;

    List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size) throws Exception;

    List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size, String noticeGubunCode) throws Exception;

        List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size,
            String noticeGubunCode, String isPinned) throws Exception;

    NoticeBoardPostVO getPost(Long tenantId, Long postId) throws Exception;

    NoticeBoardPostVO getPost(Long tenantId, Long postId, String loginCode) throws Exception;

    NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload) throws Exception;

    NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload, String actorId, String actorName) throws Exception;

    NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload) throws Exception;

    NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload, String actorId, String actorName) throws Exception;

    void updatePinned(Long tenantId, Long postId, String isPinned, String actorId, String actorName) throws Exception;

    void deletePost(Long tenantId, Long postId) throws Exception;

    void deletePost(Long tenantId, Long postId, String actorId, String actorName) throws Exception;

    NoticeBoardFileVO uploadAttachment(Long tenantId, Long postId, MultipartFile file, String uploaderId) throws Exception;

    void deleteAttachment(Long tenantId, Long boardFileId) throws Exception;

    void deleteAttachment(Long tenantId, Long postId, Long boardFileId) throws Exception;

    void downloadAttachment(Long tenantId, Long boardFileId, HttpServletResponse response) throws Exception;

    void downloadAttachment(Long tenantId, Long postId, Long boardFileId, HttpServletResponse response) throws Exception;

    void streamEmbeddedImage(Long tenantId, Long postId, String objectKey, HttpServletResponse response)
            throws Exception;
}
