package egovframework.com.common.service;

import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.common.domain.model.CommonFileVO;

public interface CommonFileService {
    List<CommonFileVO> listFiles(Long tenantId, String ownerType, Long ownerId) throws Exception;
    Map<Long, List<CommonFileVO>> listFilesByOwnerIds(Long tenantId, String ownerType, List<Long> ownerIds) throws Exception;
    CommonFileVO uploadFile(Long tenantId, String ownerType, Long ownerId, MultipartFile file, String uploaderId) throws Exception;
    void deleteFile(Long tenantId, Long fileId) throws Exception;
    void deleteFile(Long tenantId, String ownerType, Long ownerId, Long fileId) throws Exception;
    void downloadFile(Long tenantId, Long fileId, HttpServletResponse response) throws Exception;
    void downloadFile(Long tenantId, String ownerType, Long ownerId, Long fileId, HttpServletResponse response) throws Exception;
}
