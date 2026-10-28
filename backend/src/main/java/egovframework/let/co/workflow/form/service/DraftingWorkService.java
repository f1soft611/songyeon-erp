package egovframework.let.co.workflow.form.service;

import java.util.List;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkUserOptionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;

public interface DraftingWorkService {

    List<DraftingWorkUserOptionVO> listUserOptions(Long tenantId) throws Exception;

    List<DraftingWorkVO> listWorks(
            Long tenantId,
            String keyword,
            Long categoryItemId,
            Long regTermId,
            String useAt) throws Exception;

    DraftingWorkVO createWork(Long tenantId, Long actorUserId, DraftingWorkSaveRequestVO payload) throws Exception;

    DraftingWorkVO updateWork(Long tenantId, Long actorUserId, Long draftingWorkCategoryId,
            DraftingWorkSaveRequestVO payload) throws Exception;

    DraftingWorkTemplateVO getTemplate(Long tenantId, Long draftingWorkCategoryId) throws Exception;

    DraftingWorkTemplateVO saveTemplate(
            Long tenantId, Long draftingWorkCategoryId, DraftingWorkTemplateSaveRequestVO payload) throws Exception;

    DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadedBy,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception;
}