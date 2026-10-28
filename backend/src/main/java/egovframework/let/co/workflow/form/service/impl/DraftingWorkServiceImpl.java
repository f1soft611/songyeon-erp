package egovframework.let.co.workflow.form.service.impl;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkUserOptionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSearchConditionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.service.DraftingWorkService;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

@Service("draftingWorkService")
public class DraftingWorkServiceImpl extends EgovAbstractServiceImpl implements DraftingWorkService {

    private final DraftingWorkDAO draftingWorkDAO;
    private final EgovIdGnrService codeIdGnrService;
    private final CommonCodeGroupService commonCodeGroupService;
    private final CommonCodeItemService commonCodeItemService;
    private final DraftingWorkTemplateServiceImpl draftingWorkTemplateService;

    public DraftingWorkServiceImpl(
            DraftingWorkDAO draftingWorkDAO,
            @Qualifier("codeIdGnrService")
            EgovIdGnrService codeIdGnrService,
            CommonCodeGroupService commonCodeGroupService,
            CommonCodeItemService commonCodeItemService,
            @Qualifier("draftingWorkTemplateService")
            DraftingWorkTemplateServiceImpl draftingWorkTemplateService) {
        this.draftingWorkDAO = draftingWorkDAO;
        this.codeIdGnrService = codeIdGnrService;
        this.commonCodeGroupService = commonCodeGroupService;
        this.commonCodeItemService = commonCodeItemService;
        this.draftingWorkTemplateService = draftingWorkTemplateService;
    }

    @Override
    public List<DraftingWorkUserOptionVO> listUserOptions(Long tenantId) throws Exception {
        return draftingWorkDAO.selectUserOptions(tenantId);
    }

    @Override
    public List<DraftingWorkVO> listWorks(
            Long tenantId,
            String keyword,
            Long categoryItemId,
            Long regTermId,
            String useAt) throws Exception {
        DraftingWorkSearchConditionVO condition = new DraftingWorkSearchConditionVO();
        condition.setTenantId(tenantId);
        condition.setKeyword(StringUtils.hasText(keyword) ? keyword.trim() : null);
        condition.setCategoryItemId(categoryItemId);
        condition.setRegTermId(regTermId);
        String normalizedUseAt = StringUtils.hasText(useAt) ? useAt.trim().toUpperCase() : null;
        condition.setUseAt("Y".equals(normalizedUseAt) || "N".equals(normalizedUseAt)
                ? normalizedUseAt
                : null);
        return draftingWorkDAO.selectWorkList(condition);
    }

    @Override
    @Transactional
    public DraftingWorkVO createWork(Long tenantId, Long actorUserId, DraftingWorkSaveRequestVO payload) throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        if (!StringUtils.hasText(payload.getCataTypeCode())) {
            payload.setCataTypeCode(codeIdGnrService.getNextStringId());
        }
        if (!StringUtils.hasText(payload.getCodeName())) {
            throw new IllegalArgumentException("양식명은 필수입니다.");
        }
        if (payload.getCodeName().trim().length() > 50) {
            throw new IllegalArgumentException("양식명은 최대 50자까지 입력할 수 있습니다.");
        }
        if (payload.getCategoryItemId() == null) {
            throw new IllegalArgumentException("분류는 필수입니다.");
        }
        String useAt = normalizeUseAt(payload.getUseAt());
        List<String> assigneeIds = payload.getAssigneeIds() == null
            ? java.util.Collections.<String>emptyList()
            : payload.getAssigneeIds();

        CommonCodeGroupVO categoryGroup = null;
        for (CommonCodeGroupVO group : commonCodeGroupService.listGroups(tenantId)) {
            if ("WF_FORM_CATEGORY".equals(group.getGroupCode())
                    && "Y".equalsIgnoreCase(group.getUseAt())) {
                categoryGroup = group;
                break;
            }
        }
        if (categoryGroup == null) {
            throw new IllegalArgumentException("기안양식 분류 공통코드 그룹을 찾을 수 없습니다.");
        }

        CommonCodeItemVO selectedCategory = null;
        for (CommonCodeItemVO item : commonCodeItemService.listItems(
                tenantId, categoryGroup.getCommonCodeGroupId())) {
            if (payload.getCategoryItemId().equals(item.getCommonCodeItemId())) {
                selectedCategory = item;
                break;
            }
        }
        if (selectedCategory == null || !"Y".equalsIgnoreCase(selectedCategory.getUseAt())) {
            throw new IllegalArgumentException("분류 공통코드가 현재 테넌트에서 사용 중이 아닙니다.");
        }

        if (payload.getRegTermId() == null) {
            throw new IllegalArgumentException("등록주기는 필수입니다.");
        }
        CommonCodeGroupVO cycleGroup = null;
        for (CommonCodeGroupVO group : commonCodeGroupService.listGroups(tenantId)) {
            if ("WF_FORM_CYCLE".equals(group.getGroupCode())
                    && "Y".equalsIgnoreCase(group.getUseAt())) {
                cycleGroup = group;
                break;
            }
        }
        if (cycleGroup == null) {
            throw new IllegalArgumentException("기안양식 등록주기 공통코드 그룹을 찾을 수 없습니다.");
        }
        CommonCodeItemVO selectedCycle = null;
        for (CommonCodeItemVO item : commonCodeItemService.listItems(
                tenantId, cycleGroup.getCommonCodeGroupId())) {
            if (payload.getRegTermId().equals(item.getCommonCodeItemId())) {
                selectedCycle = item;
                break;
            }
        }
        if (selectedCycle == null || !"Y".equalsIgnoreCase(selectedCycle.getUseAt())) {
            throw new IllegalArgumentException("등록주기 공통코드가 현재 테넌트에서 사용 중이 아닙니다.");
        }

        List<DraftingWorkUserOptionVO> tenantUsers = draftingWorkDAO.selectUserOptions(tenantId);
        if (tenantUsers == null) {
            tenantUsers = java.util.Collections.emptyList();
        }
        if (payload.getReviewerId() != null && !containsLoginId(tenantUsers, payload.getReviewerId())) {
            throw new IllegalArgumentException("검토자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.");
        }
        if (payload.getApproverId() != null && !containsLoginId(tenantUsers, payload.getApproverId())) {
            throw new IllegalArgumentException("승인자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.");
        }
        for (String rawAssigneeId : assigneeIds) {
            String assigneeId = StringUtils.hasText(rawAssigneeId) ? rawAssigneeId.trim() : "";
            if (assigneeId.length() > 10 || !containsUserId(tenantUsers, assigneeId)) {
                throw new IllegalArgumentException("담당자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.");
            }
        }
        Long actorLoginId = resolveLoginId(tenantUsers, actorUserId);

        String cataTypeCode = payload.getCataTypeCode().trim();
        if (cataTypeCode.length() > 3) {
            throw new IllegalArgumentException("구분코드는 최대 3자리까지 입력할 수 있습니다.");
        }
        if (draftingWorkDAO.selectWorkIdByCode(tenantId, cataTypeCode) != null) {
            throw new IllegalArgumentException("이미 사용 중인 구분코드입니다.");
        }
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("categoryItemId", payload.getCategoryItemId());
        params.put("divisionCode", cataTypeCode);
        params.put("divisionName", payload.getCodeName().trim());
        params.put("regTermId", payload.getRegTermId());
        params.put("cycle", selectedCycle.getItemNm());
        params.put("reviewerId", payload.getReviewerId());
        params.put("approverId", payload.getApproverId());
        params.put("useAt", useAt);
        params.put("createdBy", actorLoginId);
        params.put("updatedBy", actorLoginId);

        Long newId = draftingWorkDAO.insertWork(params);
        if (newId == null) {
            throw new IllegalArgumentException("이미 사용 중인 구분코드입니다.");
        }
        Set<String> uniqueAssigneeIds = new LinkedHashSet<String>();
        for (String assigneeId : assigneeIds) {
            uniqueAssigneeIds.add(assigneeId.trim());
        }
        for (String assigneeId : uniqueAssigneeIds) {
            Map<String, Object> authorityParams = new HashMap<String, Object>();
            authorityParams.put("tenantId", tenantId);
            authorityParams.put("workId", newId);
            authorityParams.put("cataTypeCode", cataTypeCode);
            authorityParams.put("employeeNo", assigneeId);
            authorityParams.put("createdBy", actorLoginId);
            authorityParams.put("updatedBy", actorLoginId);
            draftingWorkDAO.insertWorkAuthorityMapping(authorityParams);
        }

        DraftingWorkVO persisted = draftingWorkDAO.selectWorkById(tenantId, newId);
        if (persisted != null) {
            return persisted;
        }

        DraftingWorkVO created = new DraftingWorkVO();
        created.setDraftingWorkCategoryId(newId);
        created.setTenantId(tenantId);
        created.setCataTypeCode(cataTypeCode);
        created.setCodeName(payload.getCodeName().trim());
        created.setCategoryItemId(payload.getCategoryItemId());
        created.setCategoryName(selectedCategory.getItemNm());
        created.setRegTermId(payload.getRegTermId());
        created.setRegTerm(selectedCycle.getItemNm());
        created.setReviewerId(payload.getReviewerId());
        created.setReviewerName(findUserNameByLoginId(tenantUsers, payload.getReviewerId()));
        created.setApproverId(payload.getApproverId());
        created.setApproverName(findUserNameByLoginId(tenantUsers, payload.getApproverId()));
        created.setAssigneeIds(new java.util.ArrayList<String>(uniqueAssigneeIds));
        created.setCreatedByName(findUserNameByLoginId(tenantUsers, actorLoginId));
        created.setUseAt(useAt);
        return created;
    }

    @Override
    @Transactional
    public DraftingWorkVO updateWork(
            Long tenantId,
            Long actorUserId,
            Long draftingWorkCategoryId,
            DraftingWorkSaveRequestVO payload) throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }
        DraftingWorkVO existing = draftingWorkDAO.selectWorkById(tenantId, draftingWorkCategoryId);
        if (existing == null) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        if (StringUtils.hasText(payload.getCataTypeCode())
                && !existing.getCataTypeCode().equals(payload.getCataTypeCode().trim())) {
            throw new IllegalArgumentException("구분코드는 수정할 수 없습니다.");
        }
        if (!StringUtils.hasText(payload.getCodeName())) {
            throw new IllegalArgumentException("양식명은 필수입니다.");
        }
        String codeName = payload.getCodeName().trim();
        if (codeName.length() > 50) {
            throw new IllegalArgumentException("양식명은 최대 50자까지 입력할 수 있습니다.");
        }
        String useAt = normalizeUseAt(payload.getUseAt());

        CommonCodeItemVO category = findActiveItem(tenantId, "WF_FORM_CATEGORY", payload.getCategoryItemId());
        if (category == null) {
            throw new IllegalArgumentException("분류 공통코드가 현재 테넌트에서 사용 중이 아닙니다.");
        }
        CommonCodeItemVO cycle = findActiveItem(tenantId, "WF_FORM_CYCLE", payload.getRegTermId());
        if (cycle == null) {
            throw new IllegalArgumentException("등록주기 공통코드가 현재 테넌트에서 사용 중이 아닙니다.");
        }

        List<DraftingWorkUserOptionVO> tenantUsers = draftingWorkDAO.selectUserOptions(tenantId);
        if (tenantUsers == null) {
            tenantUsers = java.util.Collections.emptyList();
        }
        if (payload.getReviewerId() != null && !containsLoginId(tenantUsers, payload.getReviewerId())) {
            throw new IllegalArgumentException("검토자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.");
        }
        if (payload.getApproverId() != null && !containsLoginId(tenantUsers, payload.getApproverId())) {
            throw new IllegalArgumentException("승인자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.");
        }
        List<String> requestedAssigneeIds = payload.getAssigneeIds() == null
                ? java.util.Collections.<String>emptyList()
                : payload.getAssigneeIds();
        Set<String> uniqueAssigneeIds = new LinkedHashSet<String>();
        for (String rawAssigneeId : requestedAssigneeIds) {
            String assigneeId = StringUtils.hasText(rawAssigneeId) ? rawAssigneeId.trim() : "";
            if (assigneeId.length() > 10 || !containsUserId(tenantUsers, assigneeId)) {
                throw new IllegalArgumentException("담당자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.");
            }
            uniqueAssigneeIds.add(assigneeId);
        }

        Long actorLoginId = resolveLoginId(tenantUsers, actorUserId);
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("workId", draftingWorkCategoryId);
        params.put("categoryItemId", category.getCommonCodeItemId());
        params.put("codeName", codeName);
        params.put("regTermId", cycle.getCommonCodeItemId());
        params.put("cycle", cycle.getItemNm());
        params.put("reviewerId", payload.getReviewerId());
        params.put("approverId", payload.getApproverId());
        params.put("useAt", useAt);
        params.put("updatedBy", actorLoginId);
        if (draftingWorkDAO.updateWork(params) == 0) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        draftingWorkDAO.deactivateWorkAuthorityMappings(params);
        for (String assigneeId : uniqueAssigneeIds) {
            Map<String, Object> authorityParams = new HashMap<String, Object>(params);
            authorityParams.put("cataTypeCode", existing.getCataTypeCode());
            authorityParams.put("employeeNo", assigneeId);
            authorityParams.put("createdBy", actorLoginId);
            draftingWorkDAO.insertWorkAuthorityMapping(authorityParams);
        }
        return draftingWorkDAO.selectWorkById(tenantId, draftingWorkCategoryId);
    }

    @Override
    public DraftingWorkTemplateVO getTemplate(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        return draftingWorkTemplateService.getTemplate(tenantId, draftingWorkCategoryId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        return saveTemplate(tenantId, draftingWorkCategoryId, null, payload);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadedBy,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        return draftingWorkTemplateService.saveTemplate(tenantId, draftingWorkCategoryId, uploadedBy, payload);
    }

    private CommonCodeItemVO findActiveItem(Long tenantId, String groupCode, Long itemId) throws Exception {
        if (itemId == null) {
            return null;
        }
        for (CommonCodeGroupVO group : commonCodeGroupService.listGroups(tenantId)) {
            if (!groupCode.equals(group.getGroupCode()) || !"Y".equalsIgnoreCase(group.getUseAt())) {
                continue;
            }
            for (CommonCodeItemVO item : commonCodeItemService.listItems(
                    tenantId, group.getCommonCodeGroupId())) {
                if (itemId.equals(item.getCommonCodeItemId()) && "Y".equalsIgnoreCase(item.getUseAt())) {
                    return item;
                }
            }
        }
        return null;
    }

    private String normalizeUseAt(String useAt) {
        if (!StringUtils.hasText(useAt)) {
            return "Y";
        }
        String normalized = useAt.trim().toUpperCase();
        if (!"Y".equals(normalized) && !"N".equals(normalized)) {
            throw new IllegalArgumentException("사용여부는 Y 또는 N이어야 합니다.");
        }
        return normalized;
    }

    private boolean containsLoginId(List<DraftingWorkUserOptionVO> users, Long loginId) {
        if (loginId == null) {
            return false;
        }
        for (DraftingWorkUserOptionVO user : users) {
            if (loginId.equals(user.getLoginId())) {
                return true;
            }
        }
        return false;
    }

    private Long resolveLoginId(List<DraftingWorkUserOptionVO> users, Long userId) {
        if (userId == null) {
            return null;
        }
        for (DraftingWorkUserOptionVO user : users) {
            if (userId.equals(user.getUserId())) {
                return user.getLoginId();
            }
        }
        return null;
    }

    private String findUserNameByLoginId(List<DraftingWorkUserOptionVO> users, Long loginId) {
        if (loginId == null) {
            return "";
        }
        for (DraftingWorkUserOptionVO user : users) {
            if (loginId.equals(user.getLoginId())) {
                return user.getUserNm() == null ? "" : user.getUserNm();
            }
        }
        return "";
    }

    private boolean containsUserId(List<DraftingWorkUserOptionVO> users, String userId) {
        if (!StringUtils.hasText(userId)) {
            return false;
        }
        for (DraftingWorkUserOptionVO user : users) {
            if (userId.equals(String.valueOf(user.getUserId()))) {
                return true;
            }
        }
        return false;
    }
}