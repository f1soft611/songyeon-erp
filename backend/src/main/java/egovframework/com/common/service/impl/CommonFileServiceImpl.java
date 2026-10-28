package egovframework.com.common.service.impl;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.service.MinioStorageService;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.repository.CommonFileDAO;
import egovframework.com.common.service.CommonFileService;

@Service("commonFileService")
public class CommonFileServiceImpl extends EgovAbstractServiceImpl implements CommonFileService {

    private static final String DEFAULT_BUCKET = "document-attachments";
    private static final Logger LOGGER = Logger.getLogger(CommonFileServiceImpl.class.getName());

    @Value("${storage.bucket:${STORAGE_BUCKET:document-attachments}}")
    private String storageBucket;

    private final MinioStorageService minioStorageService;
    private final CommonFileDAO commonFileDAO;

    @Autowired
    public CommonFileServiceImpl(MinioStorageService minioStorageService, CommonFileDAO commonFileDAO) {
        this.minioStorageService = minioStorageService;
        this.commonFileDAO = commonFileDAO;
    }

    @Override
    public List<CommonFileVO> listFiles(Long tenantId, String ownerType, Long ownerId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }

        if (commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 정보를 조회할 수 없습니다.");
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        List<CommonFileVO> files = commonFileDAO.selectCommonFileList(params);
        return files == null ? new ArrayList<>() : files;
    }

    @Override
    public Map<Long, List<CommonFileVO>> listFilesByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerIds == null || ownerIds.isEmpty()) {
            return new HashMap<>();
        }
        if (commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 정보를 조회할 수 없습니다.");
        }

        Set<Long> distinctIds = new HashSet<>();
        for (Long ownerId : ownerIds) {
            if (ownerId != null) {
                distinctIds.add(ownerId);
            }
        }
        if (distinctIds.isEmpty()) {
            return new HashMap<>();
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerIds", new ArrayList<>(distinctIds));
        List<CommonFileVO> files = commonFileDAO.selectCommonFileListByOwnerIds(params);
        Map<Long, List<CommonFileVO>> grouped = new HashMap<>();
        for (Long ownerId : distinctIds) {
            grouped.put(ownerId, new ArrayList<>());
        }
        if (files != null) {
            for (CommonFileVO file : files) {
                if (file == null || file.getOwnerId() == null) {
                    continue;
                }
                grouped.computeIfAbsent(file.getOwnerId(), key -> new ArrayList<>()).add(file);
            }
        }
        return grouped;
    }

    @Override
    @Transactional
    public CommonFileVO uploadFile(Long tenantId, String ownerType, Long ownerId, MultipartFile file, String uploaderId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }
        if (minioStorageService == null || commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장소를 사용할 수 없습니다.");
        }

        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드 파일명이 없습니다.");
        }

        String normalizedName = StringUtils.cleanPath(Objects.requireNonNull(originalFilename)).replace("\\", "/");
        String normalizedOwnerType = ownerType.trim().toUpperCase();
        String objectKey = "tenant/" + tenantId + "/" + normalizedOwnerType.toLowerCase() + "/" + ownerId + "/" + UUID.randomUUID();
        String bucketName = StringUtils.hasText(storageBucket) ? storageBucket.trim() : DEFAULT_BUCKET;
        boolean objectUploaded = false;

        try {
            minioStorageService.upload(bucketName, objectKey, file.getInputStream(), file.getSize(), file.getContentType());
            objectUploaded = true;
            String sha256 = sha256(file.getBytes());

            CommonFileVO uploaded = new CommonFileVO();
            uploaded.setTenantId(tenantId);
            uploaded.setOwnerType(normalizedOwnerType);
            uploaded.setOwnerId(ownerId);
            uploaded.setFileName(normalizedName);
            uploaded.setFilePath("minio://" + bucketName + "/" + objectKey);
            uploaded.setObjectKey(objectKey);
            uploaded.setBucketName(bucketName);
            uploaded.setStorageProvider("minio");
            uploaded.setFileSize(file.getSize());
            uploaded.setMimeType(file.getContentType());
            uploaded.setContentType(file.getContentType());
            uploaded.setUploadedBy(uploaderId == null ? "unknown" : uploaderId);
            uploaded.setDeletedYn("N");

            HashMap<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("ownerType", normalizedOwnerType);
            params.put("ownerId", ownerId);
            params.put("fileName", normalizedName);
            params.put("filePath", uploaded.getFilePath());
            params.put("objectKey", objectKey);
            params.put("bucketName", bucketName);
            params.put("storageProvider", "minio");
            params.put("fileSize", file.getSize());
            params.put("mimeType", file.getContentType());
            params.put("checksumSha256", sha256);
            params.put("contentType", file.getContentType());
            params.put("fileUsageType", "ATTACHMENT");
            params.put("uploadedBy", uploaderId == null ? "unknown" : uploaderId);
            params.put("deletedYn", "N");
            Long fileId = commonFileDAO.insertCommonFile(params);
            if (fileId == null) {
                throw new IllegalStateException("파일 메타데이터 ID를 저장하지 못했습니다.");
            }
            HashMap<String, Object> lookup = new HashMap<>();
            lookup.put("tenantId", tenantId);
            lookup.put("fileId", fileId);
            CommonFileVO persisted = commonFileDAO.selectCommonFileById(lookup);
            if (persisted == null) {
                throw new IllegalStateException("저장된 파일 메타데이터를 확인할 수 없습니다.");
            }
            return persisted;
        } catch (Exception ex) {
            if (objectUploaded) {
                try {
                    minioStorageService.delete(bucketName, objectKey);
                } catch (Exception cleanupException) {
                    ex.addSuppressed(cleanupException);
                    LOGGER.log(Level.SEVERE, "MinIO compensation failed. bucket=" + bucketName + ", objectKey=" + objectKey, cleanupException);
                }
            }
            LOGGER.log(Level.SEVERE, "Common file upload or metadata persistence failed. bucket=" + bucketName + ", objectKey=" + objectKey, ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 저장 중 오류가 발생했습니다.", ex);
        }
    }

    @Override
    @Transactional
    public void deleteFile(Long tenantId, Long fileId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }

        if (commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 정보를 변경할 수 없습니다.");
        }
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("fileId", fileId);
        commonFileDAO.softDeleteCommonFileExcludingApproval(params);
    }

    @Override
    @Transactional
    public void deleteFile(Long tenantId, String ownerType, Long ownerId, Long fileId) throws Exception {
        Map<String, Object> params = ownerFileParams(tenantId, ownerType, ownerId, fileId);
        if (commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 정보를 변경할 수 없습니다.");
        }
        commonFileDAO.softDeleteCommonFileByOwner(params);
    }

    @Override
    public void downloadFile(Long tenantId, Long fileId, HttpServletResponse response) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }

        if (commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 정보를 조회할 수 없습니다.");
        }
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("fileId", fileId);
        CommonFileVO file = commonFileDAO.selectCommonFileByIdExcludingApproval(params);
        streamFile(file, response);
    }

    @Override
    public void downloadFile(Long tenantId, String ownerType, Long ownerId, Long fileId,
            HttpServletResponse response) throws Exception {
        Map<String, Object> params = ownerFileParams(tenantId, ownerType, ownerId, fileId);
        if (commonFileDAO == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "파일 정보를 조회할 수 없습니다.");
        }
        CommonFileVO file = commonFileDAO.selectCommonFileByIdAndOwner(params);
        streamFile(file, response);
    }

    private void streamFile(CommonFileVO file, HttpServletResponse response) throws Exception {
        if (file == null || !StringUtils.hasText(file.getObjectKey())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }
        if (minioStorageService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일 저장소를 사용할 수 없습니다.");
        }

        response.setContentType(StringUtils.hasText(file.getMimeType()) ? file.getMimeType() : "application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + file.getFileName() + "\"");
        if (file.getFileSize() != null) {
            response.setContentLengthLong(file.getFileSize());
        }

        try (InputStream input = minioStorageService.download(file.getBucketName(), file.getObjectKey());
                ServletOutputStream output = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
            output.flush();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일 다운로드 중 오류가 발생했습니다.");
        }
    }

    private Map<String, Object> ownerFileParams(Long tenantId, String ownerType, Long ownerId, Long fileId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (fileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 ID가 없습니다.");
        }
        if (!StringUtils.hasText(ownerType) || ownerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부 파일 소유 정보가 올바르지 않습니다.");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("fileId", fileId);
        params.put("ownerType", ownerType.trim().toUpperCase());
        params.put("ownerId", ownerId);
        return params;
    }

    private String sha256(byte[] bytes) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(bytes);
        StringBuilder hex = new StringBuilder(hash.length * 2);
        for (byte b : hash) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
