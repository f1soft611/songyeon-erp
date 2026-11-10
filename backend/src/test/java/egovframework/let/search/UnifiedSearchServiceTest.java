package egovframework.let.search;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.status.service.DocumentApprovalStatusService;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.search.service.impl.UnifiedSearchServiceImpl;
import egovframework.let.search.domain.model.SearchGroupVO;
import egovframework.let.search.domain.model.SearchResponseVO;
import egovframework.let.system.menus.domain.model.*;
import egovframework.let.system.menus.service.SystemMenuService;

class UnifiedSearchServiceTest {
    private final SystemMenuService menus = mock(SystemMenuService.class);
    private final DocumentApprovalStatusService documents = mock(DocumentApprovalStatusService.class);
    private final NoticeBoardDAO notices = mock(NoticeBoardDAO.class);
    private final UnifiedSearchServiceImpl service = new UnifiedSearchServiceImpl(menus, documents, notices);
    private LoginVO user;

    @BeforeEach
    void setUp() {
        user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("00000009"); // 송연: 사번(앞 0 포함)으로 로그인한다(20261103_003)
        user.setId("test-login");
    }

    @Test
    void onlySearchesReadableInternalLeafMenusAndPaginates() throws Exception {
        MenuTreeNodeVO parent = menu(1L, "그룹", "/group", true);
        parent.setChildren(List.of(menu(2L, "문서", "/docs", true),
                menu(3L, "문서 숨김", "/hidden", false),
                menu(4L, "문서 외부", "//example.test", true),
                menu(5L, "문서 작성", "/docs/write", true)));
        tree(parent);

        SearchGroupVO page = service.search(user, " 문서 ", "MENU", 1, 1).getGroups().get(0);

        assertEquals(2L, page.getTotalCount());
        assertEquals("/docs/write", page.getItems().get(0).getPath());
        assertTrue(page.getItems().get(0).getDescription().contains("그룹"));
        verifyNoInteractions(documents, notices);
    }

    @Test
    void doesNotQueryDomainsWithoutReadableDestinationMenu() throws Exception {
        tree(menu(2L, "문서", "/groupware/doc/write", false),
                menu(3L, "공지", "/groupware/community/notice", false));

        SearchResponseVO result = service.search(user, "검색", "ALL", 0, 5);

        assertEquals(3, result.getGroups().size());
        assertTrue(result.getGroups().stream().allMatch(group -> group.getTotalCount() == 0));
        verifyNoInteractions(documents, notices);
    }

    @Test
    void reusesRelatedDocumentSearchWithAuthenticatedPrincipalAndBoundedPage() throws Exception {
        tree(menu(2L, "문서", "/groupware/doc/write", true));
        DocumentApprovalStatusListItemVO item = new DocumentApprovalStatusListItemVO();
        item.setElectronicApprovalId(18L);
        item.setTitle("검색 문서");
        item.setDocumentNo("DOC-18");
        DocumentApprovalListPageVO page = new DocumentApprovalListPageVO();
        page.setResultList(List.of(item));
        page.setTotalRowCount(12L);
        when(documents.searchDocuments(eq(user), eq("ALL"), any())).thenReturn(page);

        SearchGroupVO group = service.search(user, "검색", "DOCUMENT", 5, 5).getGroups().get(0);

        assertEquals(12L, group.getTotalCount());
        assertEquals("/groupware/doc/write?approvalId=18", group.getItems().get(0).getPath());
        ArgumentCaptor<DocumentApprovalListQueryVO> query = ArgumentCaptor.forClass(DocumentApprovalListQueryVO.class);
        verify(documents).searchDocuments(eq(user), eq("ALL"), query.capture());
        assertEquals(5, query.getValue().getOffset());
        assertEquals(5, query.getValue().getLimit());
        assertEquals("검색", query.getValue().getKeyword());
        verifyNoInteractions(notices);
    }

    @Test
    @SuppressWarnings("unchecked")
    void scopesNoticeQueryAndReturnsOnlySearchMetadata() throws Exception {
        tree(menu(2L, "공지", "/groupware/community/notice", true));
        NoticeBoardPostVO post = new NoticeBoardPostVO();
        post.setPostId(20L);
        post.setTitle("검색 공지");
        when(notices.selectNoticePostList(anyMap())).thenReturn(List.of(post));
        when(notices.selectNoticePostCount(anyMap())).thenReturn(1L);

        SearchGroupVO group = service.search(user, "검색", "NOTICE", 0, 5).getGroups().get(0);

        assertEquals("/groupware/community/notice?dashboardPostId=20", group.getItems().get(0).getPath());
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(notices).selectNoticePostList(params.capture());
        assertEquals(4L, params.getValue().get("tenantId"));
        assertEquals("NOTICE", params.getValue().get("boardTypeCode"));
        assertEquals(5, params.getValue().get("recordCountPerPage"));
        assertEquals("검색", params.getValue().get("keyword"));
    }

    @Test
    void rejectsInvalidInputAndUnauthenticatedRequestsBeforeQuerying() {
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        () -> service.search(null, "검색", "ALL", 0, 5)).getStatus());
        assertThrows(ResponseStatusException.class, () -> service.search(user, " ", "ALL", 0, 5));
        assertThrows(ResponseStatusException.class, () -> service.search(user, "a".repeat(101), "ALL", 0, 5));
        assertThrows(ResponseStatusException.class, () -> service.search(user, "검색", "OTHER", 0, 5));
        assertThrows(ResponseStatusException.class, () -> service.search(user, "검색", "ALL", 1, 5));
        assertThrows(ResponseStatusException.class, () -> service.search(user, "검색", "MENU", -1, 5));
        assertThrows(ResponseStatusException.class, () -> service.search(user, "검색", "MENU", 0, 21));
        verifyNoInteractions(menus, documents, notices);
    }

    // 송연: 사번은 숫자로 바꾸지 않으므로 빈 사번만 막는다
    @Test
    void rejectsBlankEmployeeIdBeforeQuerying() {
        user.setUniqId(" ");
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        () -> service.search(user, "검색", "ALL", 0, 5)).getStatus());
        verifyNoInteractions(menus, documents, notices);
    }

    @Test
    void rejectsUnicodeWhitespaceLoginBeforeQuerying() {
        user.setId("\u2003\t");
        assertEquals(HttpStatus.UNAUTHORIZED,
                assertThrows(ResponseStatusException.class,
                        () -> service.search(user, "검색", "ALL", 0, 5)).getStatus());
        verifyNoInteractions(menus, documents, notices);
    }

    @Test
    void omitsUnicodeWhitespaceFromDocumentDescription() throws Exception {
        tree(menu(2L, "문서", "/groupware/doc/write", true));
        DocumentApprovalStatusListItemVO item = new DocumentApprovalStatusListItemVO();
        item.setElectronicApprovalId(18L);
        item.setTitle("검색 문서");
        item.setDocumentNo("\u2003");
        item.setDrafterName("작성자");
        DocumentApprovalListPageVO page = new DocumentApprovalListPageVO();
        page.setResultList(List.of(item));
        page.setTotalRowCount(1L);
        when(documents.searchDocuments(eq(user), eq("ALL"), any())).thenReturn(page);

        assertEquals("작성자", service.search(user, "검색", "DOCUMENT", 0, 5)
                .getGroups().get(0).getItems().get(0).getDescription());
    }

    @Test
    void doesNotTurnDomainFailureIntoEmptySuccess() throws Exception {
        tree(menu(2L, "문서", "/groupware/doc/write", true));
        when(documents.searchDocuments(any(), anyString(), any())).thenThrow(new IllegalStateException("unavailable"));
        assertThrows(IllegalStateException.class, () -> service.search(user, "검색", "ALL", 0, 5));
    }

    private void tree(MenuTreeNodeVO... nodes) throws Exception {
        MyMenuResponseVO response = new MyMenuResponseVO();
        MenuTreeNodeVO root = menu(100L, "그룹웨어", "/groupware", false);
        root.setChildren(List.of(nodes));
        response.setMenus(List.of(root));
        when(menus.getMyMenuTree(eq(4L), eq("test-login"), any(), any())).thenReturn(response);
    }

    private MenuTreeNodeVO menu(Long id, String name, String path, boolean read) {
        MenuTreeNodeVO node = new MenuTreeNodeVO();
        node.setMenuId(id);
        node.setName(name);
        node.setPath(path);
        MenuPermissionVO permission = new MenuPermissionVO();
        permission.setRead(read);
        node.setPermissions(permission);
        return node;
    }
}
