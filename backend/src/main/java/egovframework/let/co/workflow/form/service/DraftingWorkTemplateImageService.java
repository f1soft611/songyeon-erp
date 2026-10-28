package egovframework.let.co.workflow.form.service;

import java.util.List;
import java.util.Set;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.EmbeddedImageDocumentStorage;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateUploadVO;

public interface DraftingWorkTemplateImageService extends EmbeddedImageDocumentStorage {

    DraftingWorkTemplateUploadVO uploadTemporaryImage(
            Long tenantId, Long draftingWorkCategoryId, MultipartFile file) throws Exception;

    void deleteTemporaryImage(
            Long tenantId, Long draftingWorkCategoryId, String uploadToken, String fileName) throws Exception;

    CommonFileVO promoteTemporaryImage(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadToken,
            String fileName,
            String uploadedBy) throws Exception;

    void streamTemplateImage(
            Long tenantId, Long draftingWorkCategoryId, Long fileId, HttpServletResponse response) throws Exception;

    List<CommonFileVO> listTemplateImages(Long tenantId, Long draftingWorkCategoryId) throws Exception;

    void completeTemplateSave(
            Long tenantId,
            Long draftingWorkCategoryId,
            List<DraftingWorkTemplateEmbeddedImageVO> temporaryImages,
            Set<Long> retainedFileIds) throws Exception;
}