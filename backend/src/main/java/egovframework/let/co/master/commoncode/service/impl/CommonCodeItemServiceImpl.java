package egovframework.let.co.master.commoncode.service.impl;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemSaveRequestVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;
import egovframework.let.common.idsequence.service.IdSequenceService;

@Service("commonCodeItemService")
public class CommonCodeItemServiceImpl extends EgovAbstractServiceImpl implements CommonCodeItemService {

    private static final String ITEM_CODE_GENERATOR_KEY = "COMMON_CODE_ITEM_CODE";
    private static final int ITEM_CODE_MINIMUM_WIDTH = 3;

    private final CommonCodeGroupDAO commonCodeGroupDAO;
    private final CommonCodeItemDAO commonCodeItemDAO;
    private final IdSequenceService idSequenceService;

    public CommonCodeItemServiceImpl(
            CommonCodeGroupDAO commonCodeGroupDAO,
            CommonCodeItemDAO commonCodeItemDAO,
            IdSequenceService idSequenceService) {
        this.commonCodeGroupDAO = commonCodeGroupDAO;
        this.commonCodeItemDAO = commonCodeItemDAO;
        this.idSequenceService = idSequenceService;
    }

    @Override
    public List<CommonCodeItemVO> listItems(Long tenantId, Long groupId) throws Exception {
        ensureGroupBelongsToTenant(tenantId, groupId);
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        return commonCodeItemDAO.selectItemList(params);
    }

    @Override
    public List<CommonCodeItemVO> listParentItems(Long tenantId, Long groupId) throws Exception {
        ensureGroupBelongsToTenant(tenantId, groupId);
        CommonCodeGroupVO group = findGroupById(tenantId, groupId);
        if (group.getParentGroupId() == null) {
            return Collections.emptyList();
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("parentGroupId", group.getParentGroupId());
        return commonCodeItemDAO.selectParentItemList(params);
    }

    @Override
    @Transactional
    public CommonCodeItemVO createItem(Long tenantId, Long groupId, CommonCodeItemSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getItemNm())) {
            throw new IllegalArgumentException("상세 코드명은 필수입니다.");
        }

        CommonCodeGroupVO group = ensureGroupBelongsToTenant(tenantId, groupId);
        validateParentItem(tenantId, group, payload.getParentItemId());
        String itemCode = normalizeOrGenerateItemCode(groupId, payload.getItemCode());
        validateItemCodeDuplication(tenantId, groupId, itemCode);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        params.put("itemCode", itemCode);
        params.put("itemNm", payload.getItemNm().trim());
        params.put("itemDc", payload.getItemDc());
        params.put("parentItemId", payload.getParentItemId());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");

        Long newId = commonCodeItemDAO.insertItem(params);
        return findItemById(tenantId, groupId, newId);
    }

    private String normalizeOrGenerateItemCode(Long groupId, String rawItemCode) throws Exception {
        if (!StringUtils.hasText(rawItemCode)) {
            Long nextValue = idSequenceService.nextValue(
                    ITEM_CODE_GENERATOR_KEY,
                    String.valueOf(groupId),
                    "");
            return formatGeneratedItemCode(nextValue);
        }

        String itemCode = rawItemCode.trim();
        if (itemCode.matches("[0-9]+")) {
            try {
                idSequenceService.advanceToAtLeast(
                        ITEM_CODE_GENERATOR_KEY,
                        String.valueOf(groupId),
                        "",
                        Long.valueOf(itemCode));
            } catch (NumberFormatException ignored) {
                // Numeric item codes outside BIGINT range do not affect the sequence.
            }
        }
        return itemCode;
    }

    private String formatGeneratedItemCode(Long value) {
        String itemCode = String.valueOf(value);
        if (itemCode.length() >= ITEM_CODE_MINIMUM_WIDTH) {
            return itemCode;
        }
        StringBuilder paddedCode = new StringBuilder(ITEM_CODE_MINIMUM_WIDTH);
        for (int index = itemCode.length(); index < ITEM_CODE_MINIMUM_WIDTH; index++) {
            paddedCode.append('0');
        }
        return paddedCode.append(itemCode).toString();
    }

    @Override
    @Transactional
    public CommonCodeItemVO updateItem(Long tenantId, Long groupId, Long itemId, CommonCodeItemSaveRequestVO payload) throws Exception {
        if (!StringUtils.hasText(payload.getItemNm())) {
            throw new IllegalArgumentException("상세 코드명은 필수입니다.");
        }

        CommonCodeGroupVO group = ensureGroupBelongsToTenant(tenantId, groupId);
        CommonCodeItemVO existing = findItemById(tenantId, groupId, itemId);
        validateParentItem(tenantId, group, payload.getParentItemId());
        if (StringUtils.hasText(payload.getItemCode())) {
            validateItemCodeDuplication(tenantId, groupId, payload.getItemCode().trim(), itemId);
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        params.put("itemId", itemId);
        params.put("itemCode", payload.getItemCode() == null ? existing.getItemCode() : payload.getItemCode().trim());
        params.put("itemNm", payload.getItemNm().trim());
        params.put("itemDc", payload.getItemDc());
        params.put("parentItemId", payload.getParentItemId());
        params.put("sortOrder", payload.getSortOrder() == null ? 0 : payload.getSortOrder());
        params.put("useAt", "N".equalsIgnoreCase(payload.getUseAt()) ? "N" : "Y");
        commonCodeItemDAO.updateItem(params);

        return findItemById(tenantId, groupId, itemId);
    }

    @Override
    @Transactional
    public void deleteItem(Long tenantId, Long groupId, Long itemId) throws Exception {
        ensureGroupBelongsToTenant(tenantId, groupId);
        findItemById(tenantId, groupId, itemId);

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        params.put("itemId", itemId);

        int childCount = commonCodeItemDAO.countChildItems(params);
        if (childCount > 0) {
            throw new IllegalArgumentException("하위 상세코드가 존재하는 상세코드는 삭제할 수 없습니다.");
        }

        commonCodeItemDAO.deleteItem(params);
    }

    private CommonCodeGroupVO ensureGroupBelongsToTenant(Long tenantId, Long groupId) throws Exception {
        CommonCodeGroupVO group = findGroupById(tenantId, groupId);
        if (group == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다.");
        }
        return group;
    }

    private CommonCodeGroupVO findGroupById(Long tenantId, Long groupId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        return commonCodeGroupDAO.selectGroupById(params);
    }

    private CommonCodeItemVO findItemById(Long tenantId, Long groupId, Long itemId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        params.put("itemId", itemId);
        CommonCodeItemVO item = commonCodeItemDAO.selectItemById(params);
        if (item == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "상세코드를 찾을 수 없습니다.");
        }
        return item;
    }

    private void validateItemCodeDuplication(Long tenantId, Long groupId, String itemCode) throws Exception {
        validateItemCodeDuplication(tenantId, groupId, itemCode, null);
    }

    private void validateItemCodeDuplication(Long tenantId, Long groupId, String itemCode, Long excludeItemId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", groupId);
        params.put("itemCode", itemCode.trim());
        Long existingId = commonCodeItemDAO.selectItemIdByCode(params);
        if (existingId != null && (excludeItemId == null || !excludeItemId.equals(existingId))) {
            throw new IllegalArgumentException("이미 사용 중인 상세 코드입니다.");
        }
    }

    private void validateParentItem(Long tenantId, CommonCodeGroupVO group, Long parentItemId) throws Exception {
        if (parentItemId == null) {
            return;
        }
        if (group.getParentGroupId() == null) {
            throw new IllegalArgumentException("상위 그룹이 없는 그룹에는 상위 상세코드를 지정할 수 없습니다.");
        }

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("groupId", group.getParentGroupId());
        params.put("itemId", parentItemId);
        CommonCodeItemVO parentItem = commonCodeItemDAO.selectItemById(params);
        if (parentItem == null) {
            throw new IllegalArgumentException("상위 상세코드는 현재 그룹의 부모 그룹 상세코드만 선택할 수 있습니다.");
        }
    }
}
