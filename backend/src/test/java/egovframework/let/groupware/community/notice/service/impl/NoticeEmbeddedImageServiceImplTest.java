package egovframework.let.groupware.community.notice.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;

class NoticeEmbeddedImageServiceImplTest {

    @Test
    void mapsSharedTemporaryUploadToExistingNoticePreviewContract() throws Exception {
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        MockMultipartFile file = new MockMultipartFile(
                "file", "pasted.png", "image/png",
                new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
        EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
        upload.setUploadToken("image-token");
        upload.setFileName("pasted.png");
        upload.setFileSize(8L);
        upload.setMimeType("image/png");
        upload.setPreviewUrl("https://minio.example/preview?expires=600");
        upload.setObjectKey("tenant/7/embedded-image-temp/image-token/pasted.png");
        upload.setBucketName("document-attachments");
        when(storage.uploadTemporaryImage(7L, file)).thenReturn(upload);
        NoticeEmbeddedImageServiceImpl service = new NoticeEmbeddedImageServiceImpl(storage);

        NoticeEmbeddedImageVO result = service.uploadTemporaryImage(7L, "user-1", file);

        assertThat(result.getUploadToken()).isEqualTo("image-token");
        assertThat(result.getFileId()).isEqualTo("image-token");
        assertThat(result.getImageUrl()).isEqualTo(upload.getPreviewUrl());
        assertThat(result.getObjectKey()).isEqualTo(upload.getObjectKey());
        assertThat(result.getBucketName()).isEqualTo("document-attachments");
        verify(storage).uploadTemporaryImage(eq(7L), eq(file));
    }

    @Test
    void deletesNoticeTemporaryUploadThroughSharedStorageService() throws Exception {
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        NoticeEmbeddedImageServiceImpl service = new NoticeEmbeddedImageServiceImpl(storage);

        service.deleteTemporaryImage(7L, "image-token", "pasted.png");

        verify(storage).deleteTemporaryImage(7L, "image-token", "pasted.png");
    }
}
