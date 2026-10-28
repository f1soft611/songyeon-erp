package egovframework.let.co.master.commoncode.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSearchCondition;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;

@Service("commonCodeGroupService")
public class CommonCodeGroupServiceImpl extends EgovAbstractServiceImpl implements CommonCodeGroupService {

    private final CommonCodeGroupDAO commonCodeGroupDAO;

    public CommonCodeGroupServiceImpl(CommonCodeGroupDAO commonCodeGroupDAO) {
        this.commonCodeGroupDAO = commonCodeGroupDAO;
    }

    @Override
    public List<CommonCodeGroupVO> listGroups(Long tenantId) throws Exception {
        return commonCodeGroupDAO.selectGroupList(tenantId);
    }

    @Override
    public List<CommonCodeGroupVO> listGroups(Long tenantId, CommonCodeGroupSearchCondition condition) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        if (condition != null) {
            putSearchValue(params, "keyword", condition.getKeyword());
            putSearchValue(params, "groupCode", condition.getGroupCode());
            putSearchValue(params, "groupNm", condition.getGroupNm());
            putSearchValue(params, "groupDc", condition.getGroupDc());
        }
        return commonCodeGroupDAO.selectGroupList(params);
    }

    private void putSearchValue(Map<String, Object> params, String key, String value) {
        if (StringUtils.hasText(value)) {
            params.put(key, value.trim());
        }
    }

    @Override
    @Transactional
    public CommonCodeGroupVO createGroup(Long tenantId, CommonCodeGroupSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getGroupCode())) {
            throw new IllegalArgumentException("그룹 코드는 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getGroupNm())) {
            throw new IllegalArgumentException("그룹명은 필수입니다.");
        }

        validateParentGroup(tenantId, payload.getParentGroupId(), null);
        validateGroupCodeDuplication(tenantId, payload.getGroupCode(), null);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupCode", payload.getGroupCode().trim());
        params.put("groupNm", payload.getGroupNm().trim());
        params.put("groupDc", payload.getGroupDc());
        params.put("parentGroupId", payload.getParentGroupId());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");

        Long newId = commonCodeGroupDAO.insertGroup(params);
        return findByIdOrThrow(tenantId, newId);
    }

    @Override
    @Transactional
    public CommonCodeGroupVO updateGroup(Long tenantId, Long groupId, CommonCodeGroupSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getGroupNm())) {
            throw new IllegalArgumentException("그룹명은 필수입니다.");
        }

        CommonCodeGroupVO existing = findByIdOrThrow(tenantId, groupId);
        if (payload.getParentGroupId() != null && payload.getParentGroupId().equals(groupId)) {
            throw new IllegalArgumentException("자기 자신을 상위 그룹으로 지정할 수 없습니다.");
        }

        validateParentGroup(tenantId, payload.getParentGroupId(), groupId);
        if (StringUtils.hasText(payload.getGroupCode())) {
            validateGroupCodeDuplication(tenantId, payload.getGroupCode().trim(), groupId);
        }

        Map<String, Object> params = new HashMap<>();
        params.put("groupId", groupId);
        params.put("tenantId", tenantId);
        params.put("groupCode", payload.getGroupCode() == null ? existing.getGroupCode() : payload.getGroupCode().trim());
        params.put("groupNm", payload.getGroupNm().trim());
        params.put("groupDc", payload.getGroupDc());
        params.put("parentGroupId", payload.getParentGroupId());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");
        commonCodeGroupDAO.updateGroup(params);

        return findByIdOrThrow(tenantId, groupId);
    }

    @Override
    @Transactional
    public void deleteGroup(Long tenantId, Long groupId) throws Exception {
        CommonCodeGroupVO group = findByIdOrThrow(tenantId, groupId);
        Map<String, Object> params = new HashMap<>();
        params.put("groupId", groupId);
        params.put("tenantId", tenantId);

        int childCount = commonCodeGroupDAO.countChildGroups(params);
        if (childCount > 0) {
            throw new IllegalArgumentException("하위 그룹이 존재하는 그룹은 삭제할 수 없습니다.");
        }
        int itemCount = commonCodeGroupDAO.countItemsByGroupId(params);
        if (itemCount > 0) {
            throw new IllegalArgumentException("상세코드가 존재하는 그룹은 삭제할 수 없습니다.");
        }

        commonCodeGroupDAO.deleteGroup(params);
    }

    private CommonCodeGroupVO findByIdOrThrow(Long tenantId, Long groupId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        CommonCodeGroupVO group = commonCodeGroupDAO.selectGroupById(params);
        if (group == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공통코드 그룹을 찾을 수 없습니다.");
        }
        return group;
    }

    private void validateGroupCodeDuplication(Long tenantId, String groupCode, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupCode", groupCode.trim());
        Long existingId = commonCodeGroupDAO.selectGroupIdByCode(params);
        if (existingId != null && (excludeId == null || !excludeId.equals(existingId))) {
            throw new IllegalArgumentException("이미 사용 중인 그룹 코드입니다.");
        }
    }

    private void validateParentGroup(Long tenantId, Long parentGroupId, Long groupId) throws Exception {
        if (parentGroupId == null) {
            return;
        }
        if (groupId != null && parentGroupId.equals(groupId)) {
            throw new IllegalArgumentException("자기 자신을 상위 그룹으로 지정할 수 없습니다.");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", parentGroupId);
        CommonCodeGroupVO parentGroup = commonCodeGroupDAO.selectGroupById(params);
        if (parentGroup == null) {
            throw new IllegalArgumentException("상위 그룹이 현재 테넌트에 속하지 않습니다.");
        }

        if (groupId != null) {
            if (isDescendantOf(groupId, parentGroupId, tenantId)) {
                throw new IllegalArgumentException("상위 그룹은 하위 그룹으로 지정할 수 없습니다.");
            }
        }
    }

    private boolean isDescendantOf(Long groupId, Long candidateParentGroupId, Long tenantId) throws Exception {
        // candidateParentGroupId가 groupId의 하위 그룹이면(조상 방향으로 올라가다 groupId를 만나면) 순환 참조이다.
        Long currentId = candidateParentGroupId;
        while (currentId != null) {
            if (currentId.equals(groupId)) {
                return true;
            }
            Map<String, Object> params = new HashMap<>();
            params.put("tenantId", tenantId);
            params.put("groupId", currentId);
            CommonCodeGroupVO current = commonCodeGroupDAO.selectGroupById(params);
            if (current == null) {
                return false;
            }
            currentId = current.getParentGroupId();
        }
        return false;
    }
}
