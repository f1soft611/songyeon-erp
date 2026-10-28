package egovframework.com.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.service.impl.CommonFileServiceImpl;

class CommonFileServiceTest {

    @Test
    void genericDownloadUsesLookupThatExcludesApprovalOwners() throws Exception {
        Map<String, Object> lookup = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public CommonFileVO selectCommonFileByIdExcludingApproval(Map<String, Object> params) {
                lookup.putAll(params);
                return null;
            }
        };
        CommonFileServiceImpl service = new CommonFileServiceImpl(null, dao);

        ResponseStatusException thrown = catchThrowableOfType(() ->
            service.downloadFile(4L, 77L, new MockHttpServletResponse()),
            ResponseStatusException.class);

        assertThat(thrown.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(lookup).containsEntry("tenantId", 4L).containsEntry("fileId", 77L);
    }

    @Test
    void genericDeleteUsesUpdateThatExcludesApprovalOwners() throws Exception {
        Map<String, Object> deleteParams = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public void softDeleteCommonFileExcludingApproval(Map<String, Object> params) {
                deleteParams.putAll(params);
            }
        };
        CommonFileServiceImpl service = new CommonFileServiceImpl(null, dao);

        service.deleteFile(4L, 77L);

        assertThat(deleteParams).containsEntry("tenantId", 4L).containsEntry("fileId", 77L);
    }

    @Test
    void uploadFileUsesConfiguredStorageBucket() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) {
                captured.put("bucketName", bucketName);
                captured.put("objectKey", objectKey);
            }
        };
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public Long insertCommonFile(Map<String, Object> params) {
                captured.putAll(params);
                return 8L;
            }

            @Override
            public CommonFileVO selectCommonFileById(Map<String, Object> params) {
                CommonFileVO file = new CommonFileVO();
                file.setFileId(8L);
                file.setFileName((String) captured.get("fileName"));
                file.setObjectKey((String) captured.get("objectKey"));
                file.setBucketName((String) captured.get("bucketName"));
                file.setFilePath((String) captured.get("filePath"));
                return file;
            }
        };
        MockMultipartFile file = new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes("UTF-8"));
        CommonFileServiceImpl service = new CommonFileServiceImpl(storageService, dao);
        ReflectionTestUtils.setField(service, "storageBucket", "tenant-documents");

        CommonFileVO uploaded = service.uploadFile(1L, "NOTICE", 2L, file, "admin");

        assertThat(captured).containsEntry("bucketName", "tenant-documents");
        assertThat(captured).containsEntry("fileName", "notice.txt");
        assertThat(uploaded.getBucketName()).isEqualTo("tenant-documents");
        assertThat(uploaded.getFilePath()).startsWith("minio://tenant-documents/");
    }

    @Test
    void uploadFileUsesDifferentObjectKeysForSameOwnerAndFileName() throws Exception {
        Map<String, byte[]> storedObjects = new HashMap<>();
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) throws Exception {
                storedObjects.put(objectKey, readInputStream(inputStream));
            }
        };
        AtomicLong nextFileId = new AtomicLong(1L);
        Map<Long, CommonFileVO> persistedFiles = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public Long insertCommonFile(Map<String, Object> params) {
                long fileId = nextFileId.getAndIncrement();
                CommonFileVO persisted = new CommonFileVO();
                persisted.setFileId(fileId);
                persisted.setFileName((String) params.get("fileName"));
                persisted.setObjectKey((String) params.get("objectKey"));
                persisted.setBucketName((String) params.get("bucketName"));
                persisted.setFilePath((String) params.get("filePath"));
                persistedFiles.put(fileId, persisted);
                return fileId;
            }

            @Override
            public CommonFileVO selectCommonFileById(Map<String, Object> params) {
                return persistedFiles.get(((Number) params.get("fileId")).longValue());
            }
        };
        CommonFileServiceImpl service = new CommonFileServiceImpl(storageService, dao);

        CommonFileVO first = service.uploadFile(
            1L, "NOTICE", 2L, new MockMultipartFile("file", "notice.txt", "text/plain", "first".getBytes("UTF-8")), "admin");
        CommonFileVO second = service.uploadFile(
            1L, "NOTICE", 2L, new MockMultipartFile("file", "notice.txt", "text/plain", "second".getBytes("UTF-8")), "admin");

        assertThat(first.getFileName()).isEqualTo("notice.txt");
        assertThat(second.getFileName()).isEqualTo("notice.txt");
        assertThat(first.getObjectKey()).isNotEqualTo(second.getObjectKey());
        assertThat(storedObjects)
            .containsEntry(first.getObjectKey(), "first".getBytes(StandardCharsets.UTF_8))
            .containsEntry(second.getObjectKey(), "second".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void uploadFileFailsBeforeMinioWhenDaoIsUnavailable() {
        List<String> uploadedKeys = new ArrayList<>();
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) {
                uploadedKeys.add(objectKey);
            }
        };
        MockMultipartFile file = new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));

        ResponseStatusException thrown = catchThrowableOfType(() ->
            new CommonFileServiceImpl(storageService, null).uploadFile(1L, "NOTICE", 2L, file, "admin"),
            ResponseStatusException.class);

        assertThat(thrown.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(uploadedKeys).isEmpty();
    }

    @Test
    void uploadFileCompensatesMinioObjectWhenMetadataInsertFails() throws Exception {
        List<String> uploadedKeys = new ArrayList<>();
        List<String> deletedKeys = new ArrayList<>();
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) {
                uploadedKeys.add(objectKey);
            }

            @Override
            public void delete(String bucketName, String objectKey) {
                deletedKeys.add(objectKey);
            }
        };
        IllegalStateException dbFailure = new IllegalStateException("metadata insert failed");
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public Long insertCommonFile(Map<String, Object> params) {
                throw dbFailure;
            }
        };

        ResponseStatusException thrown = catchThrowableOfType(() ->
            new CommonFileServiceImpl(storageService, dao).uploadFile(
                1L, "NOTICE", 2L,
                new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8)),
                "admin"),
            ResponseStatusException.class);

        assertThat(uploadedKeys).hasSize(1);
        assertThat(deletedKeys).containsExactly(uploadedKeys.get(0));
        assertThat(thrown.getCause()).isSameAs(dbFailure);
    }

    private static byte[] readInputStream(InputStream inputStream) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[4096];
        int bytesRead;
        while ((bytesRead = inputStream.read(data)) != -1) {
            buffer.write(data, 0, bytesRead);
        }
        return buffer.toByteArray();
    }

    @Test
    void uploadFileCompensatesWhenMetadataInsertReturnsNoId() throws Exception {
        List<String> uploadedKeys = new ArrayList<>();
        List<String> deletedKeys = new ArrayList<>();
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) {
                uploadedKeys.add(objectKey);
            }

            @Override
            public void delete(String bucketName, String objectKey) {
                deletedKeys.add(objectKey);
            }
        };
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public Long insertCommonFile(Map<String, Object> params) {
                return null;
            }
        };

        ResponseStatusException thrown = catchThrowableOfType(() ->
            new CommonFileServiceImpl(storageService, dao).uploadFile(
                1L, "NOTICE", 2L,
                new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8)),
                "admin"),
            ResponseStatusException.class);

        assertThat(thrown.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(uploadedKeys).hasSize(1);
        assertThat(deletedKeys).containsExactly(uploadedKeys.get(0));
    }

    @Test
    void uploadFilePreservesMetadataFailureWhenCompensationAlsoFails() throws Exception {
        List<String> uploadedKeys = new ArrayList<>();
        IOException cleanupFailure = new IOException("object cleanup failed");
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) {
                uploadedKeys.add(objectKey);
            }

            @Override
            public void delete(String bucketName, String objectKey) throws Exception {
                throw cleanupFailure;
            }
        };
        IllegalStateException dbFailure = new IllegalStateException("metadata insert failed");
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public Long insertCommonFile(Map<String, Object> params) {
                throw dbFailure;
            }
        };

        ResponseStatusException thrown = catchThrowableOfType(() ->
            new CommonFileServiceImpl(storageService, dao).uploadFile(
                1L, "NOTICE", 2L,
                new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8)),
                "admin"),
            ResponseStatusException.class);

        assertThat(thrown.getCause()).isSameAs(dbFailure);
        assertThat(dbFailure.getSuppressed()).contains(cleanupFailure);
        assertThat(uploadedKeys).hasSize(1);
    }

    @Test
    void uploadFilePreservesMinioFailureCause() throws Exception {
        IOException rootCause = new IOException("connection refused");
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public void upload(String bucketName, String objectKey, InputStream inputStream, long size, String contentType) throws Exception {
                throw rootCause;
            }
        };
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public Long insertCommonFile(Map<String, Object> params) {
                return 9L;
            }
        };
        MockMultipartFile file = new MockMultipartFile("file", "notice.txt", "text/plain", "hello".getBytes("UTF-8"));

        ResponseStatusException thrown = catchThrowableOfType(() ->
            new CommonFileServiceImpl(storageService, dao)
                .uploadFile(1L, "NOTICE", 2L, file, "admin"),
            ResponseStatusException.class);

        assertThat(thrown.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(thrown).hasCause(rootCause);
    }

    @Test
    void deleteFileIncludesOwnerWhenOwnerAwareContractIsUsed() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public void softDeleteCommonFileByOwner(Map<String, Object> params) {
                captured.putAll(params);
            }
        };

        new CommonFileServiceImpl(null, dao)
            .deleteFile(1L, "NOTICE_COMMENT", 42L, 8L);

        assertThat(captured)
            .containsEntry("tenantId", 1L)
            .containsEntry("fileId", 8L)
            .containsEntry("ownerType", "NOTICE_COMMENT")
            .containsEntry("ownerId", 42L);
    }

    @Test
    void downloadFileIncludesOwnerWhenOwnerAwareContractIsUsed() throws Exception {
        Map<String, Object> captured = new HashMap<>();
        CommonFileVO file = new CommonFileVO();
        file.setFileName("notice.txt");
        file.setObjectKey("tenant/1/notice-comment/42/notice.txt");
        file.setBucketName("tenant-documents");
        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public CommonFileVO selectCommonFileByIdAndOwner(Map<String, Object> params) {
                captured.putAll(params);
                return file;
            }
        };
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public InputStream download(String bucketName, String objectKey) {
                return new java.io.ByteArrayInputStream(new byte[0]);
            }
        };
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CommonFileServiceImpl(storageService, dao)
            .downloadFile(1L, "NOTICE_COMMENT", 42L, 8L, response);

        assertThat(captured)
            .containsEntry("tenantId", 1L)
            .containsEntry("fileId", 8L)
            .containsEntry("ownerType", "NOTICE_COMMENT")
            .containsEntry("ownerId", 42L);
    }

    @Test
    void downloadFileStreamsTheStoredObjectWithItsMetadata() throws Exception {
        CommonFileVO file = new CommonFileVO();
        file.setFileId(8L);
        file.setFileName("notice.txt");
        file.setObjectKey("tenant/1/notice/42/notice.txt");
        file.setBucketName("tenant-documents");
        file.setMimeType("text/plain");
        file.setFileSize(5L);

        CommonFileDAO dao = new CommonFileDAO() {
            @Override
            public CommonFileVO selectCommonFileByIdAndOwner(Map<String, Object> params) {
                return file;
            }
        };
        MinioStorageService storageService = new MinioStorageService(null) {
            @Override
            public InputStream download(String bucketName, String objectKey) {
                return new java.io.ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8));
            }
        };
        MockHttpServletResponse response = new MockHttpServletResponse();

        new CommonFileServiceImpl(storageService, dao)
            .downloadFile(1L, "NOTICE", 42L, 8L, response);

        assertThat(response.getContentType()).isEqualTo("text/plain");
        assertThat(response.getHeader("Content-Disposition"))
            .isEqualTo("attachment; filename=\"notice.txt\"");
        assertThat(response.getContentAsByteArray()).isEqualTo("hello".getBytes(StandardCharsets.UTF_8));
    }
}