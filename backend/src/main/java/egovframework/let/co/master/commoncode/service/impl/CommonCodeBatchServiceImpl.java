package egovframework.let.co.master.commoncode.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchChangeSetVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchItemChangeSetVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeBatchSaveResultVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupChangeVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemChangeVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;
import egovframework.let.co.master.commoncode.service.CommonCodeBatchService;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;

@Service("commonCodeBatchService")
public class CommonCodeBatchServiceImpl extends EgovAbstractServiceImpl implements CommonCodeBatchService {

    private final CommonCodeGroupDAO commonCodeGroupDAO;
    private final CommonCodeItemDAO commonCodeItemDAO;
    private final CommonCodeGroupService commonCodeGroupService;
    private final CommonCodeItemService commonCodeItemService;

    public CommonCodeBatchServiceImpl(
            CommonCodeGroupDAO commonCodeGroupDAO,
            CommonCodeItemDAO commonCodeItemDAO,
            CommonCodeGroupService commonCodeGroupService,
            CommonCodeItemService commonCodeItemService) {
        this.commonCodeGroupDAO = commonCodeGroupDAO;
        this.commonCodeItemDAO = commonCodeItemDAO;
        this.commonCodeGroupService = commonCodeGroupService;
        this.commonCodeItemService = commonCodeItemService;
    }

    @Override
    @Transactional
    public CommonCodeBatchSaveResultVO saveBatch(Long tenantId, CommonCodeBatchSaveRequestVO payload) throws Exception {
        if (payload == null) {
            throw new IllegalArgumentException("저장 요청이 비어 있습니다.");
        }

        CommonCodeBatchChangeSetVO groupChanges = payload.getGroups() == null ? new CommonCodeBatchChangeSetVO() : payload.getGroups();
        CommonCodeBatchItemChangeSetVO itemChanges = payload.getItems() == null ? new CommonCodeBatchItemChangeSetVO() : payload.getItems();

        List<CommonCodeGroupVO> savedGroups = new ArrayList<>();
        List<CommonCodeItemVO> savedItems = new ArrayList<>();

        Map<String, Long> tempGroupIdToPersistedGroupId = new HashMap<>();

        for (CommonCodeGroupChangeVO row : groupChanges.getInsertedRows()) {
            validateGroupRow(row);
            CommonCodeGroupSaveRequestVO groupPayload = toGroupPayload(row, tenantId, tempGroupIdToPersistedGroupId);
            CommonCodeGroupVO created = commonCodeGroupService.createGroup(tenantId, groupPayload);
            tempGroupIdToPersistedGroupId.put(String.valueOf(row.getId()), created.getCommonCodeGroupId());
            savedGroups.add(created);
        }

        for (CommonCodeGroupChangeVO row : groupChanges.getUpdatedRows()) {
            validateGroupRow(row);
            Long groupId = toLong(row.getId());
            if (groupId == null) {
                throw new IllegalArgumentException("그룹 수정 시 ID가 필요합니다.");
            }
            CommonCodeGroupSaveRequestVO groupPayload = toGroupPayload(row, tenantId, tempGroupIdToPersistedGroupId);
            CommonCodeGroupVO updated = commonCodeGroupService.updateGroup(tenantId, groupId, groupPayload);
            savedGroups.add(updated);
        }

        for (CommonCodeItemChangeVO row : itemChanges.getDeletedRows()) {
            Long groupId = resolveGroupId(tenantId, row.getGroupId(), tempGroupIdToPersistedGroupId);
            Long itemId = toLong(row.getId());
            if (itemId == null) {
                throw new IllegalArgumentException("상세 삭제 시 ID가 필요합니다.");
            }
            commonCodeItemService.deleteItem(tenantId, groupId, itemId);
        }

        for (CommonCodeGroupChangeVO row : groupChanges.getDeletedRows()) {
            Long groupId = toLong(row.getId());
            if (groupId == null) {
                throw new IllegalArgumentException("그룹 삭제 시 ID가 필요합니다.");
            }
            commonCodeGroupService.deleteGroup(tenantId, groupId);
        }

        for (CommonCodeItemChangeVO row : itemChanges.getInsertedRows()) {
            validateItemRow(row, true);
            String rawGroupId = row.getGroupId();
            Long groupId = resolveGroupId(tenantId, rawGroupId, tempGroupIdToPersistedGroupId);
            CommonCodeItemVO created = commonCodeItemService.createItem(tenantId, groupId, toItemPayload(row));
            savedItems.add(created);
        }

        for (CommonCodeItemChangeVO row : itemChanges.getUpdatedRows()) {
            validateItemRow(row, false);
            Long groupId = resolveGroupId(tenantId, row.getGroupId(), tempGroupIdToPersistedGroupId);
            Long itemId = toLong(row.getId());
            if (itemId == null) {
                throw new IllegalArgumentException("상세 수정 시 ID가 필요합니다.");
            }
            CommonCodeItemVO updated = commonCodeItemService.updateItem(tenantId, groupId, itemId, toItemPayload(row));
            savedItems.add(updated);
        }

        CommonCodeBatchSaveResultVO result = new CommonCodeBatchSaveResultVO();
        result.setGroups(savedGroups);
        result.setItems(savedItems);
        return result;
    }

    private void validateGroupRow(CommonCodeGroupChangeVO row) {
        if (row == null) {
            throw new IllegalArgumentException("그룹 변경 행이 비어 있습니다.");
        }
        if (!StringUtils.hasText(row.getGroupCode())) {
            throw new IllegalArgumentException("그룹 코드는 필수입니다.");
        }
        if (!StringUtils.hasText(row.getGroupNm())) {
            throw new IllegalArgumentException("그룹명은 필수입니다.");
        }
    }

    private void validateItemRow(CommonCodeItemChangeVO row, boolean allowEmptyCode) {
        if (row == null) {
            throw new IllegalArgumentException("상세 변경 행이 비어 있습니다.");
        }
        if (!allowEmptyCode && !StringUtils.hasText(row.getItemCode())) {
            throw new IllegalArgumentException("상세코드는 필수입니다.");
        }
        if (!StringUtils.hasText(row.getItemNm())) {
            throw new IllegalArgumentException("상세코드명은 필수입니다.");
        }
    }

    private CommonCodeGroupSaveRequestVO toGroupPayload(
            CommonCodeGroupChangeVO row,
            Long tenantId,
            Map<String, Long> tempGroupIdToPersistedGroupId) throws Exception {
        CommonCodeGroupSaveRequestVO payload = new CommonCodeGroupSaveRequestVO();
        payload.setGroupCode(row.getGroupCode());
        payload.setGroupNm(row.getGroupNm());
        payload.setGroupDc(row.getGroupDc());
        payload.setParentGroupId(resolveParentGroupId(tenantId, row.getParentGroupId(), tempGroupIdToPersistedGroupId));
        payload.setSortOrder(row.getSortOrder());
        payload.setUseAt(row.getUseAt());
        return payload;
    }

    private CommonCodeItemSaveRequestVO toItemPayload(CommonCodeItemChangeVO row) {
        CommonCodeItemSaveRequestVO payload = new CommonCodeItemSaveRequestVO();
        payload.setItemCode(row.getItemCode());
        payload.setItemNm(row.getItemNm());
        payload.setItemDc(row.getItemDc());
        payload.setParentItemId(toLong(row.getParentItemId()));
        payload.setSortOrder(row.getSortOrder());
        payload.setUseAt(row.getUseAt());
        return payload;
    }

    private Long resolveParentGroupId(Long tenantId, String rawParentGroupId, Map<String, Long> tempGroupIdToPersistedGroupId) throws Exception {
        if (!StringUtils.hasText(rawParentGroupId)) {
            return null;
        }

        Long persistedGroupId = tempGroupIdToPersistedGroupId.get(rawParentGroupId);
        if (persistedGroupId != null) {
            return persistedGroupId;
        }

        Long resolved = toLong(rawParentGroupId);
        if (resolved == null) {
            throw new IllegalArgumentException("유효하지 않은 상위 그룹 ID입니다: " + rawParentGroupId);
        }
        return resolved;
    }

    private Long resolveGroupId(Long tenantId, String rawGroupId, Map<String, Long> tempGroupIdToPersistedGroupId) throws Exception {
        if (!StringUtils.hasText(rawGroupId)) {
            throw new IllegalArgumentException("상세코드 저장 시 그룹 ID가 필요합니다.");
        }

        Long persistedGroupId = tempGroupIdToPersistedGroupId.get(rawGroupId);
        if (persistedGroupId != null) {
            return persistedGroupId;
        }

        Long resolved = toLong(rawGroupId);
        if (resolved == null) {
            throw new IllegalArgumentException("유효하지 않은 그룹 ID입니다: " + rawGroupId);
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", resolved);
        if (commonCodeGroupDAO.selectGroupById(params) == null) {
            throw new IllegalArgumentException("존재하지 않는 그룹입니다: " + rawGroupId);
        }
        return resolved;
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String text = String.valueOf(value).trim();
        if (!text.isEmpty()) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
