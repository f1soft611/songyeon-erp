package egovframework.let.co.workflow.form.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import io.minio.StatObjectResponse;

class DraftingWorkTemplateImageAdapterTest {

    @Test
    void validatesFormAndMapsCommonTemporaryUploadPreview() throws Exception {
        DraftingWorkDAO workDAO = mock(DraftingWorkDAO.class);
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(workDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
        upload.setUploadToken("bde1fdec-5d22-487a-a254-2b9547cd32b3");
        upload.setFileName("pasted.png");
        upload.setFileSize(8L);
        upload.setMimeType("image/png");
        upload.setPreviewUrl("https://minio.example/presigned");
        when(storage.uploadTemporaryImage(eq(9L), any())).thenReturn(upload);
        DraftingWorkTemplateImageServiceImpl adapter = new DraftingWorkTemplateImageServiceImpl(workDAO, storage);

        DraftingWorkTemplateUploadVO result = adapter.uploadTemporaryImage(9L, 77L,
                new MockMultipartFile("file", "pasted.png", "image/png", new byte[] {1}));

        assertEquals(upload.getUploadToken(), result.getUploadToken());
        assertEquals(upload.getPreviewUrl(), result.getPreviewUrl());
        verify(workDAO).selectWorkById(9L, 77L);
        verify(storage).uploadTemporaryImage(eq(9L), any());
    }

    @Test
    void rejectsForeignFormBeforeCallingCommonStorage() throws Exception {
        DraftingWorkDAO workDAO = mock(DraftingWorkDAO.class);
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(workDAO.selectWorkById(9L, 77L)).thenReturn(null);
        DraftingWorkTemplateImageServiceImpl adapter = new DraftingWorkTemplateImageServiceImpl(workDAO, storage);

        org.junit.jupiter.api.Assertions.assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> adapter.uploadTemporaryImage(9L, 77L,
                        new MockMultipartFile("file", "pasted.png", "image/png", new byte[] {1})));

        verifyNoInteractions(storage);
    }

    @Test
    void promotesImageWithDraftOwnerAndFormId() throws Exception {
        DraftingWorkDAO workDAO = mock(DraftingWorkDAO.class);
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(workDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        CommonFileVO file = new CommonFileVO();
        file.setFileId(901L);
        when(storage.promoteTemporaryImage(9L, "DRAFTING_WORK_TEMPLATE", 77L,
                "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png", "login-9"))
                .thenReturn(file);
        DraftingWorkTemplateImageServiceImpl adapter = new DraftingWorkTemplateImageServiceImpl(workDAO, storage);

        CommonFileVO result = adapter.promoteTemporaryImage(9L, 77L,
                "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png", "login-9");

        assertEquals(901L, result.getFileId());
        verify(storage).promoteTemporaryImage(9L, "DRAFTING_WORK_TEMPLATE", 77L,
                "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png", "login-9");
    }

    @Test
    void mapsSessionUploadsAndRetainedFilesToOwnerSaveCleanup() throws Exception {
        DraftingWorkDAO workDAO = mock(DraftingWorkDAO.class);
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(workDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateEmbeddedImageVO upload = new DraftingWorkTemplateEmbeddedImageVO();
        upload.setUploadToken("bde1fdec-5d22-487a-a254-2b9547cd32b3");
        upload.setFileName("pasted.png");
        DraftingWorkTemplateImageServiceImpl adapter = new DraftingWorkTemplateImageServiceImpl(workDAO, storage);

        adapter.completeTemplateSave(9L, 77L, Collections.singletonList(upload), Collections.singleton(901L));

        verify(storage).completeOwnerSave(eq(9L), eq("DRAFTING_WORK_TEMPLATE"), eq(77L), any(),
                eq(Collections.singleton(901L)));
    }

    @Test
    void deletesAndStreamsOnlyThroughDraftOwnerBoundary() throws Exception {
        DraftingWorkDAO workDAO = mock(DraftingWorkDAO.class);
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(workDAO.selectWorkById(9L, 77L)).thenReturn(new DraftingWorkVO());
        DraftingWorkTemplateImageServiceImpl adapter = new DraftingWorkTemplateImageServiceImpl(workDAO, storage);
        javax.servlet.http.HttpServletResponse response = mock(javax.servlet.http.HttpServletResponse.class);

        adapter.deleteTemporaryImage(9L, 77L, "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png");
        adapter.streamTemplateImage(9L, 77L, 901L, response);

        verify(storage).deleteTemporaryImage(9L, "bde1fdec-5d22-487a-a254-2b9547cd32b3", "pasted.png");
        verify(storage).streamOwnedImage(9L, "DRAFTING_WORK_TEMPLATE", 77L, 901L, response);
    }
}