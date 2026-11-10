package egovframework.let.search.service.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.status.service.DocumentApprovalStatusService;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.search.domain.model.SearchGroupVO;
import egovframework.let.search.domain.model.SearchItemVO;
import egovframework.let.search.domain.model.SearchResponseVO;
import egovframework.let.search.service.UnifiedSearchService;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

@Service("unifiedSearchService")
public class UnifiedSearchServiceImpl implements UnifiedSearchService {
    private static final String DOCUMENT_PATH = "/groupware/doc/write";
    private static final String NOTICE_PATH = "/groupware/community/notice";
    private static final List<String> TYPES = Collections.unmodifiableList(Arrays.asList("MENU", "DOCUMENT", "NOTICE"));
    private final SystemMenuService menuService;
    private final DocumentApprovalStatusService documentService;
    private final NoticeBoardDAO noticeDAO;

    public UnifiedSearchServiceImpl(SystemMenuService menuService,
            DocumentApprovalStatusService documentService, NoticeBoardDAO noticeDAO) {
        this.menuService = menuService;
        this.documentService = documentService;
        this.noticeDAO = noticeDAO;
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResponseVO search(LoginVO user, String keyword, String type, int offset, int limit)
            throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                // 송연: uniqId 는 사번(앞 0 포함, 20261103_003) — S_ERP 의 숫자 확인 대신 빈 값만 막는다
                || !StringUtils.hasText(user.getUniqId())
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        String text = keyword == null ? "" : keyword.trim();
        if (text.length() < 2 || text.length() > 100 || (!"ALL".equals(type) && !TYPES.contains(type))
                || offset < 0 || offset > 10000 || limit < 1 || limit > 20
                || ("ALL".equals(type) && offset != 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "검색 조건이 올바르지 않습니다.");
        }
        MyMenuResponseVO tree = menuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        List<SearchItemVO> menus = new ArrayList<>();
        if (tree == null || tree.getMenus() == null) {
            throw new IllegalStateException("검색 권한을 확인할 수 없습니다.");
        }
        // The root nodes are modules, not searchable menus.
        for (MenuTreeNodeVO module : tree.getMenus()) {
            collectMenus(module.getChildren(), module.getName(), menus);
        }
        Set<String> readablePaths = menus.stream().map(SearchItemVO::getPath).collect(Collectors.toSet());
        List<SearchGroupVO> groups = new ArrayList<>();
        for (String current : "ALL".equals(type) ? TYPES : Collections.singletonList(type)) {
            switch (current) {
                case "MENU":
                    String lowerText = text.toLowerCase(Locale.ROOT);
                    List<SearchItemVO> matches = menus.stream()
                            .filter(item -> item.getTitle().toLowerCase(Locale.ROOT).contains(lowerText)
                                    || item.getPath().toLowerCase(Locale.ROOT).contains(lowerText))
                            .collect(Collectors.toList());
                    groups.add(new SearchGroupVO(current,
                            matches.stream().skip(offset).limit(limit).collect(Collectors.toList()),
                            matches.size(), offset, limit));
                    break;
                case "DOCUMENT":
                    groups.add(readablePaths.contains(DOCUMENT_PATH)
                            ? documents(user, text, offset, limit) : empty(current, offset, limit));
                    break;
                case "NOTICE":
                    groups.add(readablePaths.contains(NOTICE_PATH)
                            ? notices(user, text, offset, limit) : empty(current, offset, limit));
                    break;
                default:
                    throw new IllegalStateException("Unsupported search type");
            }
        }
        return new SearchResponseVO(groups);
    }

    private void collectMenus(List<MenuTreeNodeVO> nodes, String breadcrumb, List<SearchItemVO> result) {
        if (nodes == null) return;
        for (MenuTreeNodeVO node : nodes) {
            String label = node.getName() == null ? "" : node.getName();
            if (node.getChildren() != null && !node.getChildren().isEmpty()) {
                collectMenus(node.getChildren(), breadcrumb + " > " + label, result);
            } else if (node.getMenuId() != null && node.getPermissions() != null
                    && node.getPermissions().isRead() && internalPath(node.getPath())) {
                result.add(new SearchItemVO(node.getMenuId(), "MENU", label, breadcrumb, node.getPath()));
            }
        }
    }

    private boolean internalPath(String path) {
        return path != null && path.startsWith("/") && !path.startsWith("//")
                && !path.contains("\\") && path.chars().noneMatch(Character::isISOControl);
    }

    private SearchGroupVO documents(LoginVO user, String keyword, int offset, int limit) throws Exception {
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setKeyword(keyword);
        query.setOffset(offset);
        query.setLimit(limit);
        query.setSortField("updatedAt");
        query.setSortDirection("DESC");
        DocumentApprovalListPageVO page = documentService.searchDocuments(user, "ALL", query);
        if (page == null || page.getResultList() == null) {
            throw new IllegalStateException("문서 검색 결과를 확인할 수 없습니다.");
        }
        List<SearchItemVO> items = page.getResultList().stream()
                .map(item -> new SearchItemVO(item.getElectronicApprovalId(), "DOCUMENT", item.getTitle(),
                        description(item.getDocumentNo(), item.getDrafterName()),
                        DOCUMENT_PATH + "?approvalId=" + item.getElectronicApprovalId()))
                .collect(Collectors.toList());
        return new SearchGroupVO("DOCUMENT", items, page.getTotalRowCount(), offset, limit);
    }

    private SearchGroupVO notices(LoginVO user, String keyword, int offset, int limit) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("boardTypeCode", "NOTICE");
        params.put("keyword", keyword);
        params.put("firstIndex", offset);
        params.put("recordCountPerPage", limit);
        List<NoticeBoardPostVO> posts = noticeDAO.selectNoticePostList(params);
        Long count = noticeDAO.selectNoticePostCount(params);
        if (posts == null || count == null) {
            throw new IllegalStateException("공지 검색 결과를 확인할 수 없습니다.");
        }
        List<SearchItemVO> items = posts.stream()
                .map(post -> new SearchItemVO(post.getPostId(), "NOTICE", post.getTitle(),
                        post.getWriterName() == null ? "" : post.getWriterName(),
                        NOTICE_PATH + "?dashboardPostId=" + post.getPostId()))
                .collect(Collectors.toList());
        return new SearchGroupVO("NOTICE", items, count, offset, limit);
    }

    private String description(String number, String author) {
        return java.util.stream.Stream.of(number, author)
                .filter(StringUtils::hasText).collect(Collectors.joining(" · "));
    }

    private SearchGroupVO empty(String type, int offset, int limit) {
        return new SearchGroupVO(type, Collections.emptyList(), 0, offset, limit);
    }
}
