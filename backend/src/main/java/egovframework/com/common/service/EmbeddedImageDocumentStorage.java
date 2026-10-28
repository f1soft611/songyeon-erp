package egovframework.com.common.service;

import java.util.List;

import egovframework.com.common.domain.model.CommonFileVO;

public interface EmbeddedImageDocumentStorage {

    List<CommonFileVO> listOwnedImages(Long tenantId, String ownerType, Long ownerId) throws Exception;

    CommonFileVO promoteTemporaryImage(
            Long tenantId,
            String ownerType,
            Long ownerId,
            String uploadToken,
            String fileName,
            String uploadedBy) throws Exception;
}