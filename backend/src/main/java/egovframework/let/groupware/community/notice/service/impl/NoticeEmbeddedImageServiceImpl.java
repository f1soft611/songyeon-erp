package egovframework.let.groupware.community.notice.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;
import egovframework.let.groupware.community.notice.service.NoticeEmbeddedImageService;

@Service
public class NoticeEmbeddedImageServiceImpl implements NoticeEmbeddedImageService {

    private final EmbeddedImageStorageService imageStorageService;

    public NoticeEmbeddedImageServiceImpl(EmbeddedImageStorageService imageStorageService) {
        this.imageStorageService = imageStorageService;
    }

    @Override
    public NoticeEmbeddedImageVO uploadTemporaryImage(Long tenantId, String uploaderId,
            MultipartFile file) throws Exception {
        EmbeddedImageUploadVO uploaded = imageStorageService.uploadTemporaryImage(tenantId, file);
        NoticeEmbeddedImageVO result = new NoticeEmbeddedImageVO();
        result.setUploadToken(uploaded.getUploadToken());
        result.setFileId(uploaded.getUploadToken());
        result.setFileName(uploaded.getFileName());
        result.setFileSize(uploaded.getFileSize());
        result.setMimeType(uploaded.getMimeType());
        result.setObjectKey(uploaded.getObjectKey());
        result.setBucketName(uploaded.getBucketName());
        result.setImageUrl(uploaded.getPreviewUrl());
        return result;
    }

    @Override
    public void deleteTemporaryImage(Long tenantId, String uploadToken, String fileName) throws Exception {
        imageStorageService.deleteTemporaryImage(tenantId, uploadToken, fileName);
    }
}
