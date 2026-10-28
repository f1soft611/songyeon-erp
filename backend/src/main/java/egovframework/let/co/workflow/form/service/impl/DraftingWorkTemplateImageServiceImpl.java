package egovframework.let.co.workflow.form.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;

@Service("draftingWorkTemplateImageService")
public class DraftingWorkTemplateImageServiceImpl implements DraftingWorkTemplateImageService {

    private static final String OWNER_TYPE = "DRAFTING_WORK_TEMPLATE";

    private final DraftingWorkDAO draftingWorkDAO;
    private final EmbeddedImageStorageService imageStorageService;

    @Autowired
    public DraftingWorkTemplateImageServiceImpl(
            DraftingWorkDAO draftingWorkDAO,
            EmbeddedImageStorageService imageStorageService) {
        this.draftingWorkDAO = draftingWorkDAO;
        this.imageStorageService = imageStorageService;
    }

    @Override
    public DraftingWorkTemplateUploadVO uploadTemporaryImage(
            Long tenantId, Long draftingWorkCategoryId, MultipartFile file) throws Exception {
        requireForm(tenantId, draftingWorkCategoryId);
        EmbeddedImageUploadVO uploaded = imageStorageService.uploadTemporaryImage(tenantId, file);
        DraftingWorkTemplateUploadVO result = new DraftingWorkTemplateUploadVO();
        result.setUploadToken(uploaded.getUploadToken());
        result.setFileName(uploaded.getFileName());
        result.setFileSize(uploaded.getFileSize());
        result.setMimeType(uploaded.getMimeType());
        result.setPreviewUrl(uploaded.getPreviewUrl());
        return result;
    }

    @Override
    public void deleteTemporaryImage(
            Long tenantId, Long draftingWorkCategoryId, String uploadToken, String fileName) throws Exception {
        requireForm(tenantId, draftingWorkCategoryId);
        imageStorageService.deleteTemporaryImage(tenantId, uploadToken, fileName);
    }

    @Override
    public CommonFileVO promoteTemporaryImage(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadToken,
            String fileName,
            String uploadedBy) throws Exception {
        requireForm(tenantId, draftingWorkCategoryId);
        return imageStorageService.promoteTemporaryImage(
                tenantId, OWNER_TYPE, draftingWorkCategoryId, uploadToken, fileName, uploadedBy);
    }

    @Override
    public void streamTemplateImage(
            Long tenantId,
            Long draftingWorkCategoryId,
            Long fileId,
            HttpServletResponse response) throws Exception {
        requireForm(tenantId, draftingWorkCategoryId);
        imageStorageService.streamOwnedImage(
                tenantId, OWNER_TYPE, draftingWorkCategoryId, fileId, response);
    }

    @Override
    public List<CommonFileVO> listTemplateImages(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        requireForm(tenantId, draftingWorkCategoryId);
        return imageStorageService.listOwnedImages(tenantId, OWNER_TYPE, draftingWorkCategoryId);
    }

    @Override
    public List<CommonFileVO> listOwnedImages(Long tenantId, String ownerType, Long ownerId) throws Exception {
        requireOwnerType(ownerType);
        return listTemplateImages(tenantId, ownerId);
    }

    @Override
    public CommonFileVO promoteTemporaryImage(
            Long tenantId,
            String ownerType,
            Long ownerId,
            String uploadToken,
            String fileName,
            String uploadedBy) throws Exception {
        requireOwnerType(ownerType);
        return promoteTemporaryImage(tenantId, ownerId, uploadToken, fileName, uploadedBy);
    }

    @Override
    public void completeTemplateSave(
            Long tenantId,
            Long draftingWorkCategoryId,
            List<DraftingWorkTemplateEmbeddedImageVO> temporaryImages,
            Set<Long> retainedFileIds) throws Exception {
        requireForm(tenantId, draftingWorkCategoryId);
        List<EmbeddedImageUploadVO> uploads = new ArrayList<EmbeddedImageUploadVO>();
        if (temporaryImages != null) {
            for (DraftingWorkTemplateEmbeddedImageVO image : temporaryImages) {
                if (image == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "임시 이미지 정보가 올바르지 않습니다.");
                }
                EmbeddedImageUploadVO mapped = new EmbeddedImageUploadVO();
                mapped.setUploadToken(image.getUploadToken());
                mapped.setFileName(image.getFileName());
                uploads.add(mapped);
            }
        }
        imageStorageService.completeOwnerSave(
                tenantId, OWNER_TYPE, draftingWorkCategoryId, uploads, retainedFileIds);
    }

    private void requireForm(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (draftingWorkCategoryId == null
                || draftingWorkDAO.selectWorkById(tenantId, draftingWorkCategoryId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "기안양식을 찾을 수 없습니다.");
        }
    }

    private void requireOwnerType(String ownerType) {
        if (!OWNER_TYPE.equalsIgnoreCase(ownerType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기안양식 본문 이미지 소유 유형이 올바르지 않습니다.");
        }
    }

}
