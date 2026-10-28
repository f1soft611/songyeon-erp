package egovframework.com.common.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import io.minio.StatObjectResponse;

class EmbeddedImageStorageServiceImplTest {

    @Test
    void uploadsTemporaryImageToSharedTaggedPrefixAndReturnsPreviewUrl() throws Exception {
        MinioStorageService storage = mock(MinioStorageService.class);
        CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
        when(storage.getPresignedObjectUrl(eq("document-attachments"), any(String.class), eq(600)))
                .thenReturn("https://minio.example/preview?expires=600");
        EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                storage, commonFileDAO, "document-attachments", 1024L, 600L);

        EmbeddedImageUploadVO result = service.uploadTemporaryImage(9L, png("../pasted.png"));

        assertEquals("pasted.png", result.getFileName());
        assertEquals(8L, result.getFileSize());
        assertEquals("image/png", result.getMimeType());
        assertEquals("https://minio.example/preview?expires=600", result.getPreviewUrl());
        assertEquals("tenant/9/embedded-image-temp/" + result.getUploadToken() + "/pasted.png",
                result.getObjectKey());
        assertEquals("document-attachments", result.getBucketName());
        verify(storage).uploadTagged(eq("document-attachments"), argThat(key ->
                key.startsWith("tenant/9/embedded-image-temp/")
                        && key.endsWith("/pasted.png")), any(InputStream.class), eq(8L), eq("image/png"),
                eq(Collections.singletonMap("s-erp-temp-owner", "embedded-image")));
    }

    @Test
    void rejectsInvalidImageSignatureAndOversizedFileBeforeMinioUpload() throws Exception {
        MinioStorageService storage = mock(MinioStorageService.class);
        EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                storage, mock(CommonFileDAO.class), "document-attachments", 7L, 600L);

        ResponseStatusException invalidSignature = org.junit.jupiter.api.Assertions.assertThrows(
                ResponseStatusException.class,
                () -> service.uploadTemporaryImage(9L,
                        new MockMultipartFile("file", "fake.png", "image/png", "not-png".getBytes("UTF-8"))));
        ResponseStatusException tooLarge = org.junit.jupiter.api.Assertions.assertThrows(
                ResponseStatusException.class, () -> service.uploadTemporaryImage(9L, png("large.png")));

        assertEquals(HttpStatus.BAD_REQUEST, invalidSignature.getStatus());
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, tooLarge.getStatus());
        verify(storage, org.mockito.Mockito.never()).uploadTagged(any(), any(), any(), any(Long.class), any(), any());
    }

    @Test
    void rejectsJpegMimeWithOnlyTheThreeByteStartMarker() throws Exception {
        MinioStorageService storage = mock(MinioStorageService.class);
        EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                storage, mock(CommonFileDAO.class), "document-attachments", 1024L, 600L);
        MockMultipartFile truncated = new MockMultipartFile(
                "file", "short.jpg", "image/jpeg", new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff});

        assertEquals(HttpStatus.BAD_REQUEST, org.junit.jupiter.api.Assertions.assertThrows(
                ResponseStatusException.class, () -> service.uploadTemporaryImage(9L, truncated)).getStatus());
        verify(storage, org.mockito.Mockito.never()).uploadTagged(any(), any(), any(), any(Long.class), any(), any());
    }

    @Test
    void acceptsJpegGifAndWebpWhenMimeAndSignatureMatch() throws Exception {
        MinioStorageService storage = mock(MinioStorageService.class);
        EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                storage, mock(CommonFileDAO.class), "document-attachments", 1024L, 600L);

        service.uploadTemporaryImage(9L, image("photo.jpg", "image/jpeg",
                new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0}));
        service.uploadTemporaryImage(9L, image("animation.gif", "image/gif",
                new byte[] {'G', 'I', 'F', '8', '9', 'a'}));
        service.uploadTemporaryImage(9L, image("image.webp", "image/webp",
                new byte[] {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'}));

        verify(storage, org.mockito.Mockito.times(3)).uploadTagged(
                eq("document-attachments"), any(String.class), any(InputStream.class),
                any(Long.class), any(String.class), any(Map.class));
    }

    @Test
    void promotesTemporaryImageToOwnerScopedPermanentKeyAndRegistersCommonFile() throws Exception {
        MinioStorageService storage = mock(MinioStorageService.class);
        CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
        StatObjectResponse metadata = mock(StatObjectResponse.class);
        when(metadata.contentType()).thenReturn("image/png");
        when(metadata.size()).thenReturn(8L);
        when(storage.stat(eq("document-attachments"), any(String.class))).thenReturn(metadata);
        when(commonFileDAO.insertCommonFile(any(Map.class))).thenReturn(113L);
        EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                storage, commonFileDAO, "document-attachments", 1024L, 600L);
        String uploadToken = "bde1fdec-5d22-487a-a254-2b9547cd32b3";

        CommonFileVO result = service.promoteTemporaryImage(
                9L, "NOTICE", 44L, uploadToken, "pasted.png", "actor-9");

        assertEquals(113L, result.getFileId());
        assertEquals("NOTICE", result.getOwnerType());
        assertEquals(44L, result.getOwnerId());
        assertEquals("EMBEDDED", result.getFileUsageType());
        assertEquals("tenant/9/embedded-images/notice/44/" + uploadToken + "/pasted.png",
                result.getObjectKey());
        verify(storage).copyWithoutTags("document-attachments",
                "tenant/9/embedded-image-temp/" + uploadToken + "/pasted.png",
                "tenant/9/embedded-images/notice/44/" + uploadToken + "/pasted.png");
        verify(commonFileDAO).insertCommonFile(argThat(params ->
                "NOTICE".equals(params.get("ownerType"))
                        && Long.valueOf(44L).equals(params.get("ownerId"))
                        && "EMBEDDED".equals(params.get("fileUsageType"))
                        && "minio".equals(params.get("storageProvider"))));
    }

            @Test
            void removesPermanentCopyButKeepsTemporarySourceWhenCommonFileInsertFails() throws Exception {
                MinioStorageService storage = mock(MinioStorageService.class);
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                StatObjectResponse metadata = mock(StatObjectResponse.class);
                when(metadata.contentType()).thenReturn("image/png");
                when(metadata.size()).thenReturn(8L);
                when(storage.stat(eq("document-attachments"), any(String.class))).thenReturn(metadata);
                when(commonFileDAO.insertCommonFile(any(Map.class))).thenReturn(null);
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                        storage, commonFileDAO, "document-attachments", 1024L, 600L);
                String uploadToken = "bde1fdec-5d22-487a-a254-2b9547cd32b3";
                String permanentKey = "tenant/9/embedded-images/notice/44/" + uploadToken + "/pasted.png";
                String temporaryKey = "tenant/9/embedded-image-temp/" + uploadToken + "/pasted.png";

                assertThrows(IllegalStateException.class, () -> service.promoteTemporaryImage(
                        9L, "NOTICE", 44L, uploadToken, "pasted.png", "actor-9"));

                verify(storage).delete("document-attachments", permanentKey);
                verify(storage, never()).delete("document-attachments", temporaryKey);
            }

        @Test
        void removesPermanentObjectWhenOwningDatabaseTransactionRollsBack() throws Exception {
                MinioStorageService storage = mock(MinioStorageService.class);
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                StatObjectResponse metadata = mock(StatObjectResponse.class);
                when(metadata.contentType()).thenReturn("image/png");
                when(metadata.size()).thenReturn(8L);
                when(storage.stat(eq("document-attachments"), any(String.class))).thenReturn(metadata);
                when(commonFileDAO.insertCommonFile(any(Map.class))).thenReturn(113L);
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                                storage, commonFileDAO, "document-attachments", 1024L, 600L);
                String uploadToken = "bde1fdec-5d22-487a-a254-2b9547cd32b3";
                String permanentKey = "tenant/9/embedded-images/notice/44/" + uploadToken + "/pasted.png";
                TransactionSynchronizationManager.initSynchronization();

                try {
                        service.promoteTemporaryImage(9L, "NOTICE", 44L, uploadToken, "pasted.png", "actor-9");
                        TransactionSynchronizationManager.getSynchronizations().get(0)
                                        .afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
                } finally {
                        TransactionSynchronizationManager.clearSynchronization();
                }

                verify(storage).delete("document-attachments", permanentKey);
                verify(storage, never()).delete("document-attachments",
                        "tenant/9/embedded-image-temp/" + uploadToken + "/pasted.png");
        }

            @Test
            void deletesTemporaryImageByTenantTokenAndSafeFileName() throws Exception {
                MinioStorageService storage = mock(MinioStorageService.class);
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                        storage, mock(CommonFileDAO.class), "document-attachments", 1024L, 600L);
                String uploadToken = "bde1fdec-5d22-487a-a254-2b9547cd32b3";

                service.deleteTemporaryImage(9L, uploadToken, "../pasted.png");

                verify(storage).delete("document-attachments",
                        "tenant/9/embedded-image-temp/" + uploadToken + "/pasted.png");
            }

            @Test
            void completeOwnerSaveDeletesOnlyRemovedEmbeddedFilesAndSessionTemporaryObjectsAfterCommit() throws Exception {
                MinioStorageService storage = mock(MinioStorageService.class);
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                CommonFileVO removed = commonFile(112L, "EMBEDDED", "tenant/9/embedded-images/notice/44/old.png");
                CommonFileVO retained = commonFile(113L, "EMBEDDED", "tenant/9/embedded-images/notice/44/keep.png");
                CommonFileVO attachment = commonFile(114L, "ATTACHMENT", "tenant/9/notice/44/attachment.pdf");
                when(commonFileDAO.selectCommonFileList(any(Map.class)))
                        .thenReturn(java.util.Arrays.asList(removed, retained, attachment));
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                        storage, commonFileDAO, "document-attachments", 1024L, 600L);
                List<EmbeddedImageUploadVO> sessionUploads = new ArrayList<EmbeddedImageUploadVO>();
                EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
                upload.setUploadToken("bde1fdec-5d22-487a-a254-2b9547cd32b3");
                upload.setFileName("pasted.png");
                sessionUploads.add(upload);
                TransactionSynchronizationManager.initSynchronization();

                try {
                    service.completeOwnerSave(9L, "NOTICE", 44L, sessionUploads,
                            new HashSet<Long>(Collections.singletonList(113L)));

                    verify(commonFileDAO).softDeleteCommonFileByOwner(argThat((Map<String, Object> params) ->
                            Long.valueOf(9L).equals(params.get("tenantId"))
                                    && Long.valueOf(112L).equals(params.get("fileId"))
                                    && "NOTICE".equals(params.get("ownerType"))
                                    && Long.valueOf(44L).equals(params.get("ownerId"))));
                    verify(commonFileDAO, never()).softDeleteCommonFileByOwner(argThat((Map<String, Object> params) ->
                            Long.valueOf(114L).equals(params.get("fileId"))));
                    List<TransactionSynchronization> synchronizations =
                            TransactionSynchronizationManager.getSynchronizations();
                    synchronizations.get(0).afterCommit();

                    verify(storage).delete("document-attachments", removed.getObjectKey());
                    verify(storage).delete("document-attachments",
                            "tenant/9/embedded-image-temp/" + upload.getUploadToken() + "/pasted.png");
                    verify(storage, never()).delete("document-attachments", retained.getObjectKey());
                    verify(storage, never()).delete("document-attachments", attachment.getObjectKey());
                } finally {
                    TransactionSynchronizationManager.clearSynchronization();
                }
            }

            @Test
            void rejectsTemporaryDeleteOutsideTenantOrWithInvalidToken() throws Exception {
                MinioStorageService storage = mock(MinioStorageService.class);
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                        storage, mock(CommonFileDAO.class), "document-attachments", 1024L, 600L);

                assertThrows(org.springframework.web.server.ResponseStatusException.class,
                        () -> service.deleteTemporaryImage(null, "bad-token", "image.png"));
                verify(storage, never()).delete(any(String.class), any(String.class));
            }

        @Test
        void rejectsInvalidSessionUploadMetadataBeforeSoftDeletingOwnedImages() throws Exception {
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                                mock(MinioStorageService.class), commonFileDAO, "document-attachments", 1024L, 600L);
                EmbeddedImageUploadVO invalid = new EmbeddedImageUploadVO();
                invalid.setUploadToken("not-a-uuid");
                invalid.setFileName("image.png");

                assertThrows(ResponseStatusException.class, () -> service.completeOwnerSave(
                                9L, "NOTICE", 44L, Collections.singletonList(invalid), Collections.<Long>emptySet()));

                verify(commonFileDAO, never()).selectCommonFileList(any(Map.class));
                verify(commonFileDAO, never()).softDeleteCommonFileByOwner(any(Map.class));
        }

            @Test
            void streamsAnEmbeddedImageOnlyAfterTenantOwnerAndUsageTypeMatch() throws Exception {
                MinioStorageService storage = mock(MinioStorageService.class);
                CommonFileDAO commonFileDAO = mock(CommonFileDAO.class);
                CommonFileVO file = commonFile(113L, "EMBEDDED", "tenant/9/embedded-images/notice/44/image.png");
                file.setMimeType("image/png");
                when(commonFileDAO.selectCommonFileByIdAndOwner(any(Map.class))).thenReturn(file);
                byte[] imageBytes = new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10};
                when(storage.download("document-attachments", file.getObjectKey()))
                        .thenReturn(new ByteArrayInputStream(imageBytes));
                EmbeddedImageStorageServiceImpl service = new EmbeddedImageStorageServiceImpl(
                        storage, commonFileDAO, "document-attachments", 1024L, 600L);
                MockHttpServletResponse response = new MockHttpServletResponse();

                service.streamOwnedImage(9L, "NOTICE", 44L, 113L, response);

                assertEquals("image/png", response.getContentType());
                assertEquals("private, max-age=300", response.getHeader("Cache-Control"));
                assertEquals("inline", response.getHeader("Content-Disposition"));
                assertEquals("nosniff", response.getHeader("X-Content-Type-Options"));
                org.junit.jupiter.api.Assertions.assertArrayEquals(imageBytes, response.getContentAsByteArray());
                verify(commonFileDAO).selectCommonFileByIdAndOwner(argThat(params ->
                        Long.valueOf(9L).equals(params.get("tenantId"))
                                && "NOTICE".equals(params.get("ownerType"))
                                && Long.valueOf(44L).equals(params.get("ownerId"))
                                && Long.valueOf(113L).equals(params.get("fileId"))));
            }

            private CommonFileVO commonFile(Long fileId, String usageType, String objectKey) {
                CommonFileVO file = new CommonFileVO();
                file.setFileId(fileId);
                file.setTenantId(9L);
                file.setOwnerType("NOTICE");
                file.setOwnerId(44L);
                file.setFileUsageType(usageType);
                file.setObjectKey(objectKey);
                file.setBucketName("document-attachments");
                return file;
            }

        private MockMultipartFile image(String fileName, String mimeType, byte[] bytes) {
                return new MockMultipartFile("file", fileName, mimeType, bytes);
        }

    private MockMultipartFile png(String fileName) {
        return new MockMultipartFile("file", fileName, "image/png",
                new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
    }
}