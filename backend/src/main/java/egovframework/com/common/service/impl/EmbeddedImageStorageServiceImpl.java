package egovframework.com.common.service.impl;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import io.minio.StatObjectResponse;

@Service("embeddedImageStorageService")
public class EmbeddedImageStorageServiceImpl implements EmbeddedImageStorageService {

    private static final long DEFAULT_MAX_FILE_SIZE = 10L * 1024L * 1024L;
    private static final long MAX_PRESIGN_EXPIRY_SECONDS = 7L * 24L * 60L * 60L;
    private static final String TEMPORARY_PREFIX = "embedded-image-temp";
    private static final String TEMPORARY_TAG_KEY = "s-erp-temp-owner";
    private static final String TEMPORARY_TAG_VALUE = "embedded-image";
    private static final Logger LOGGER = Logger.getLogger(EmbeddedImageStorageServiceImpl.class.getName());

    private final MinioStorageService storageService;
    private final CommonFileDAO commonFileDAO;
    private final String bucketName;
    private final long maxFileSize;
    private final long presignExpirySeconds;

    public EmbeddedImageStorageServiceImpl(
            MinioStorageService storageService,
            CommonFileDAO commonFileDAO,
            @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}") String bucketName,
            @Value("${storage.embeddedImageMaxFileSize:${STORAGE_EMBEDDED_IMAGE_MAX_FILE_SIZE:10485760}}") long maxFileSize,
            @Value("${storage.presignExpirySeconds:${STORAGE_PRESIGN_EXPIRY_SECONDS:600}}") long presignExpirySeconds) {
        this.storageService = storageService;
        this.commonFileDAO = commonFileDAO;
        this.bucketName = StringUtils.hasText(bucketName) ? bucketName.trim() : "document-attachments";
        this.maxFileSize = maxFileSize > 0 ? maxFileSize : DEFAULT_MAX_FILE_SIZE;
        this.presignExpirySeconds = presignExpirySeconds > 0
                ? Math.min(presignExpirySeconds, MAX_PRESIGN_EXPIRY_SECONDS)
                : 600L;
    }

    @Override
    public EmbeddedImageUploadVO uploadTemporaryImage(Long tenantId, MultipartFile file) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 이미지가 없습니다.");
        }
        if (file.getSize() > maxFileSize) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "이미지 파일 크기가 제한을 초과했습니다.");
        }

        String mimeType = normalizeMimeType(file.getContentType());
        byte[] bytes = file.getBytes();
        if (!isSupportedImage(mimeType, bytes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 파일입니다.");
        }

        String uploadToken = UUID.randomUUID().toString();
        String fileName = safeFileName(file.getOriginalFilename());
        String objectKey = temporaryObjectKey(tenantId, uploadToken, fileName);
        storageService.uploadTagged(bucketName, objectKey, new ByteArrayInputStream(bytes), bytes.length,
                mimeType, Collections.singletonMap(TEMPORARY_TAG_KEY, TEMPORARY_TAG_VALUE));

        EmbeddedImageUploadVO result = new EmbeddedImageUploadVO();
        result.setUploadToken(uploadToken);
        result.setFileName(fileName);
        result.setFileSize((long) bytes.length);
        result.setMimeType(mimeType);
        result.setPreviewUrl(storageService.getPresignedObjectUrl(
                bucketName, objectKey, (int) presignExpirySeconds));
        result.setObjectKey(objectKey);
        result.setBucketName(bucketName);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CommonFileVO promoteTemporaryImage(
            Long tenantId,
            String ownerType,
            Long ownerId,
            String uploadToken,
            String originalFileName,
            String uploadedBy) throws Exception {
        requireTenant(tenantId);
        String normalizedOwnerType = normalizeOwnerType(ownerType);
        if (ownerId == null || ownerId <= 0 || !isCanonicalUuid(uploadToken)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        String fileName = safeFileName(originalFileName);
        if (!StringUtils.hasText(originalFileName) || !StringUtils.hasText(fileName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 파일명이 올바르지 않습니다.");
        }

        String temporaryKey = temporaryObjectKey(tenantId, uploadToken, fileName);
        String permanentKey = permanentObjectKey(tenantId, normalizedOwnerType, ownerId, uploadToken, fileName);
        StatObjectResponse metadata = storageService.stat(bucketName, temporaryKey);
        String mimeType = normalizeMimeType(metadata.contentType());
        long fileSize = metadata.size();
        if (fileSize <= 0 || fileSize > maxFileSize || !isSupportedMimeType(mimeType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 메타데이터가 올바르지 않습니다.");
        }

        storageService.copyWithoutTags(bucketName, temporaryKey, permanentKey);
        try {
            Map<String, Object> params = new HashMap<String, Object>();
            params.put("tenantId", tenantId);
            params.put("ownerType", normalizedOwnerType);
            params.put("ownerId", ownerId);
            params.put("fileName", fileName);
            params.put("filePath", "minio://" + bucketName + "/" + permanentKey);
            params.put("objectKey", permanentKey);
            params.put("bucketName", bucketName);
            params.put("storageProvider", "minio");
            params.put("fileSize", fileSize);
            params.put("mimeType", mimeType);
            params.put("checksumSha256", null);
            params.put("contentType", mimeType);
            params.put("fileUsageType", "EMBEDDED");
            params.put("uploadedBy", StringUtils.hasText(uploadedBy) ? uploadedBy : "unknown");
            params.put("deletedYn", "N");
            Long fileId = commonFileDAO.insertCommonFile(params);
            if (fileId == null) {
                throw new IllegalStateException("본문 이미지 정보를 저장하지 못했습니다.");
            }

            registerRollbackCleanup(permanentKey);
            CommonFileVO result = new CommonFileVO();
            result.setFileId(fileId);
            result.setTenantId(tenantId);
            result.setOwnerType(normalizedOwnerType);
            result.setOwnerId(ownerId);
            result.setFileName(fileName);
            result.setFilePath("minio://" + bucketName + "/" + permanentKey);
            result.setObjectKey(permanentKey);
            result.setBucketName(bucketName);
            result.setStorageProvider("minio");
            result.setFileSize(fileSize);
            result.setMimeType(mimeType);
            result.setContentType(mimeType);
            result.setFileUsageType("EMBEDDED");
            result.setUploadedBy(StringUtils.hasText(uploadedBy) ? uploadedBy : "unknown");
            result.setDeletedYn("N");
            return result;
        } catch (Exception exception) {
            deleteObjectQuietly(permanentKey);
            throw exception;
        }
    }

    @Override
    public void deleteTemporaryImage(Long tenantId, String uploadToken, String originalFileName) throws Exception {
        requireTenant(tenantId);
        if (!isCanonicalUuid(uploadToken) || !StringUtils.hasText(originalFileName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 정보가 올바르지 않습니다.");
        }
        String fileName = safeFileName(originalFileName);
        if (!StringUtils.hasText(fileName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 파일명이 올바르지 않습니다.");
        }
        storageService.delete(bucketName, temporaryObjectKey(tenantId, uploadToken, fileName));
    }

    @Override
    public List<CommonFileVO> listOwnedImages(Long tenantId, String ownerType, Long ownerId) throws Exception {
        requireTenant(tenantId);
        String normalizedOwnerType = normalizeOwnerType(ownerType);
        if (ownerId == null || ownerId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("ownerType", normalizedOwnerType);
        params.put("ownerId", ownerId);
        List<CommonFileVO> files = commonFileDAO.selectCommonFileList(params);
        List<CommonFileVO> images = new ArrayList<CommonFileVO>();
        if (files != null) {
            for (CommonFileVO file : files) {
                if (file != null && "EMBEDDED".equalsIgnoreCase(file.getFileUsageType())) {
                    images.add(file);
                }
            }
        }
        return images;
    }

    @Override
    public void completeOwnerSave(
            Long tenantId,
            String ownerType,
            Long ownerId,
            List<EmbeddedImageUploadVO> sessionUploads,
            Set<Long> retainedFileIds) throws Exception {
        requireTenant(tenantId);
        String normalizedOwnerType = normalizeOwnerType(ownerType);
        if (ownerId == null || ownerId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        List<EmbeddedImageUploadVO> uploads = sessionUploads == null
                ? Collections.<EmbeddedImageUploadVO>emptyList()
                : new ArrayList<EmbeddedImageUploadVO>(sessionUploads);
        for (EmbeddedImageUploadVO upload : uploads) {
            if (upload == null || !isCanonicalUuid(upload.getUploadToken())
                    || !StringUtils.hasText(upload.getFileName())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 정보가 올바르지 않습니다.");
            }
        }
        Set<Long> retained = retainedFileIds == null ? new HashSet<Long>() : retainedFileIds;
        List<CommonFileVO> removedImages = new ArrayList<CommonFileVO>();
        for (CommonFileVO image : listOwnedImages(tenantId, normalizedOwnerType, ownerId)) {
            if (image.getFileId() != null && !retained.contains(image.getFileId())) {
                Map<String, Object> params = new HashMap<String, Object>();
                params.put("tenantId", tenantId);
                params.put("ownerType", normalizedOwnerType);
                params.put("ownerId", ownerId);
                params.put("fileId", image.getFileId());
                commonFileDAO.softDeleteCommonFileByOwner(params);
                removedImages.add(image);
            }
        }
        registerAfterCommit(new Runnable() {
            @Override
            public void run() {
                for (CommonFileVO image : removedImages) {
                    if (image != null && StringUtils.hasText(image.getBucketName())
                            && StringUtils.hasText(image.getObjectKey())) {
                        deleteObjectQuietly(image.getBucketName(), image.getObjectKey());
                    }
                }
                for (EmbeddedImageUploadVO upload : uploads) {
                    if (upload != null) {
                        try {
                            deleteTemporaryImage(tenantId, upload.getUploadToken(), upload.getFileName());
                        } catch (Exception exception) {
                            LOGGER.log(Level.WARNING, "Failed to clean up temporary embedded image "
                                    + upload.getUploadToken(), exception);
                        }
                    }
                }
            }
        });
    }

    @Override
    public void streamOwnedImage(
            Long tenantId,
            String ownerType,
            Long ownerId,
            Long fileId,
            HttpServletResponse response) throws Exception {
        requireTenant(tenantId);
        String normalizedOwnerType = normalizeOwnerType(ownerType);
        if (ownerId == null || fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("ownerType", normalizedOwnerType);
        params.put("ownerId", ownerId);
        params.put("fileId", fileId);
        CommonFileVO file = commonFileDAO.selectCommonFileByIdAndOwner(params);
        if (file == null || !"EMBEDDED".equalsIgnoreCase(file.getFileUsageType())
                || !StringUtils.hasText(file.getBucketName()) || !StringUtils.hasText(file.getObjectKey())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "본문 이미지를 찾을 수 없습니다.");
        }
        response.setContentType(StringUtils.hasText(file.getMimeType())
                ? file.getMimeType() : "application/octet-stream");
        response.setHeader("Cache-Control", "private, max-age=300");
        response.setHeader("Content-Disposition", "inline");
        response.setHeader("X-Content-Type-Options", "nosniff");
        try (InputStream input = storageService.download(file.getBucketName(), file.getObjectKey());
                ServletOutputStream output = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
            output.flush();
        }
    }

    private String temporaryObjectKey(Long tenantId, String uploadToken, String fileName) {
        return "tenant/" + tenantId + "/" + TEMPORARY_PREFIX + "/" + uploadToken + "/" + fileName;
    }

    private String permanentObjectKey(
            Long tenantId, String ownerType, Long ownerId, String uploadToken, String fileName) {
        return "tenant/" + tenantId + "/embedded-images/" + ownerType.toLowerCase(Locale.ROOT)
                + "/" + ownerId + "/" + uploadToken + "/" + fileName;
    }

    private void requireTenant(Long tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private String normalizeOwnerType(String ownerType) {
        String normalized = ownerType == null ? "" : ownerType.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z][A-Z0-9_]{0,63}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 소유 유형이 올바르지 않습니다.");
        }
        return normalized;
    }

    private boolean isCanonicalUuid(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }
        try {
            return UUID.fromString(value).toString().equalsIgnoreCase(value);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean isSupportedMimeType(String mimeType) {
        return "image/png".equals(mimeType)
                || "image/jpeg".equals(mimeType)
                || "image/gif".equals(mimeType)
                || "image/webp".equals(mimeType);
    }

    private void registerRollbackCleanup(String... objectKeys) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    for (String objectKey : objectKeys) {
                        deleteObjectQuietly(objectKey);
                    }
                }
            }
        });
    }

    private void registerAfterCommit(Runnable cleanup) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            cleanup.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                cleanup.run();
            }
        });
    }

    private void deleteObjectQuietly(String objectKey) {
        deleteObjectQuietly(bucketName, objectKey);
    }

    private void deleteObjectQuietly(String targetBucket, String objectKey) {
        try {
            storageService.delete(targetBucket, objectKey);
        } catch (Exception exception) {
            LOGGER.log(Level.WARNING, "Failed to clean up embedded image object " + objectKey, exception);
        }
    }

    private String normalizeMimeType(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String safeFileName(String originalName) {
        String fileName = StringUtils.cleanPath(originalName == null ? "pasted-image" : originalName)
                .replace('\\', '/');
        int slashIndex = fileName.lastIndexOf('/');
        if (slashIndex >= 0) {
            fileName = fileName.substring(slashIndex + 1);
        }
        return StringUtils.hasText(fileName) ? fileName : "pasted-image";
    }

    private boolean isSupportedImage(String mimeType, byte[] bytes) {
        if ("image/png".equals(mimeType)) {
            return startsWith(bytes, new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10});
        }
        if ("image/jpeg".equals(mimeType)) {
            if (!startsWith(bytes, new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff})
                    || bytes.length < 4) {
                return false;
            }
            int marker = bytes[3] & 0xff;
            return marker >= 0xc0 && marker <= 0xfe
                    && marker != 0xc8 && marker != 0xd8 && marker != 0xd9;
        }
        if ("image/gif".equals(mimeType)) {
            return startsWith(bytes, new byte[] {'G', 'I', 'F', '8'});
        }
        return "image/webp".equals(mimeType) && bytes != null && bytes.length >= 12
                && startsWith(bytes, new byte[] {'R', 'I', 'F', 'F'})
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
    }

    private boolean startsWith(byte[] value, byte[] prefix) {
        if (value == null || value.length < prefix.length) {
            return false;
        }
        for (int index = 0; index < prefix.length; index++) {
            if (value[index] != prefix[index]) {
                return false;
            }
        }
        return true;
    }
}