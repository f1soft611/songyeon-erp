package egovframework.let.groupware.community.notice.service;

import org.springframework.web.multipart.MultipartFile;

import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;

public interface NoticeEmbeddedImageService {
    NoticeEmbeddedImageVO uploadTemporaryImage(Long tenantId, String uploaderId, MultipartFile file) throws Exception;

    void deleteTemporaryImage(Long tenantId, String uploadToken, String fileName) throws Exception;
}
