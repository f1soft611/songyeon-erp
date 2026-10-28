package egovframework.let.groupware.community.common;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;

@Component
public class CommunityCategoryValidator {

    private static final Map<String, String> CATEGORY_GROUPS;

    static {
        Map<String, String> groups = new HashMap<>();
        groups.put("NOTICE", "NOTICE_GUBUN");
        groups.put("ARCHIVE", "WF_ARCHIVE_CATEGORY");
        CATEGORY_GROUPS = java.util.Collections.unmodifiableMap(groups);
    }

    private final CommonCodeGroupDAO groupDAO;
    private final CommonCodeItemDAO itemDAO;

    public CommunityCategoryValidator(CommonCodeGroupDAO groupDAO, CommonCodeItemDAO itemDAO) {
        this.groupDAO = groupDAO;
        this.itemDAO = itemDAO;
    }

    public void validate(Long tenantId, String boardTypeCode, String categoryCode) throws Exception {
        String groupCode = CATEGORY_GROUPS.get(boardTypeCode);
        if (tenantId == null || groupCode == null || !StringUtils.hasText(categoryCode)) {
            throw invalidCategory();
        }

        Map<String, Object> groupParams = new HashMap<>();
        groupParams.put("tenantId", tenantId);
        groupParams.put("groupCode", groupCode);
        List<CommonCodeGroupVO> groups = groupDAO.selectGroupList(groupParams);
        CommonCodeGroupVO activeGroup = groups == null ? null : groups.stream()
                .filter(group -> group != null
                        && groupCode.equals(group.getGroupCode())
                        && "Y".equalsIgnoreCase(group.getUseAt()))
                .findFirst()
                .orElse(null);
        if (activeGroup == null || activeGroup.getCommonCodeGroupId() == null) {
            throw invalidCategory();
        }

        Map<String, Object> itemParams = new HashMap<>();
        itemParams.put("tenantId", tenantId);
        itemParams.put("groupId", activeGroup.getCommonCodeGroupId());
        List<CommonCodeItemVO> items = itemDAO.selectItemList(itemParams);
        boolean activeItemExists = items != null && items.stream().anyMatch(item -> item != null
                && activeGroup.getCommonCodeGroupId().equals(item.getGroupId())
                && categoryCode.trim().equals(item.getItemCode())
                && "Y".equalsIgnoreCase(item.getUseAt()));
        if (!activeItemExists) {
            throw invalidCategory();
        }
    }

    private ResponseStatusException invalidCategory() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "사용할 수 없는 커뮤니티 분류입니다.");
    }
}
