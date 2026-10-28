package egovframework.let.groupware.community.archive.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeGroupDAO;
import egovframework.let.co.master.commoncode.domain.repository.CommonCodeItemDAO;
import egovframework.let.groupware.community.archive.domain.model.*;
import egovframework.let.groupware.community.archive.domain.repository.ArchiveBoardDAO;
import egovframework.let.groupware.community.common.CommunityCategoryValidator;

class ArchiveBoardServiceImplTest {
    private ArchiveBoardDAO dao;
    private CommonFileService files;
    private CommunityCategoryValidator categories;
    private ArchiveBoardServiceImpl service;
    private LoginVO user;
    private Map<String, Object> config;
    private ArchiveBoardPostSaveRequestVO payload;

    @BeforeEach
    void setUp() throws Exception {
        dao = mock(ArchiveBoardDAO.class);
        files = mock(CommonFileService.class);
        categories = mock(CommunityCategoryValidator.class);
        service = new ArchiveBoardServiceImpl(dao, files, categories);
        user = new LoginVO();
        user.setTenantId(71L);
        user.setId("test-admin");
        user.setName("Test administrator");
        user.setRoleCode("TENANT_ADMIN");
        config = new HashMap<>();
        config.put("useYn", "Y");
        config.put("writeAuthLevel", "ADMIN");
        config.put("fileUploadYn", "Y");
        when(dao.selectArchiveBoardConfig()).thenReturn(config);
        ArchiveBoardPostVO post = new ArchiveBoardPostVO();
        post.setPostId(13L);
        when(dao.selectArchivePostById(anyMap())).thenReturn(post);
        when(dao.selectArchivePostForUpdate(anyMap())).thenReturn(post);
        when(dao.updateArchivePost(anyMap())).thenReturn(1);
        when(dao.softDeleteArchivePost(anyMap())).thenReturn(1);
        when(files.listFiles(71L, "ARCHIVE", 13L)).thenReturn(Collections.emptyList());
        payload = new ArchiveBoardPostSaveRequestVO();
        payload.setTitle(" Manual ");
        payload.setContents(" first line\nsecond line \n");
        payload.setCategoryCode("GENERAL");
    }

    @Test
    void listAndDetailOverrideTenantAndFixBoardMaps() throws Exception {
        ArchiveBoardPostSearchVO search = new ArchiveBoardPostSearchVO();
        search.setTenantId(999L);
        search.setKeyword(" manual ");
        search.setCategoryCode(" GENERAL ");
        search.setPageIndex(2);
        search.setPageUnit(5);
        when(dao.selectArchivePostList(anyMap())).thenReturn(Collections.singletonList(new ArchiveBoardPostVO()));
        when(dao.selectArchivePostCount(anyMap())).thenReturn(1L);
        assertThat(service.listPosts(search, user).getResultCnt()).isEqualTo(1L);
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).selectArchivePostList(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L).containsEntry("boardTypeCode", "ARCHIVE")
                .containsEntry("keyword", "manual").containsEntry("categoryCode", "GENERAL")
                .containsEntry("firstIndex", 5).containsEntry("recordCountPerPage", 5);
        verify(dao).selectArchivePostCount(params.getValue());
        verify(categories).validate(71L, "ARCHIVE", "GENERAL");
        assertThat(service.getPost(13L, user).getAttachments()).isEmpty();
        verify(dao).selectArchivePostById(argThat(map -> Long.valueOf(71).equals(map.get("tenantId"))
                && "ARCHIVE".equals(map.get("boardTypeCode")) && Long.valueOf(13).equals(map.get("postId"))));
    }

    @Test
    void listFilesAppliesSearchFiltersAndAllowsReadingInactiveFolders() throws Exception {
        ArchiveBoardFileSearchVO search = new ArchiveBoardFileSearchVO();
        search.setTenantId(999L);
        search.setKeyword(" manual ");
        search.setFolderCode(" INACTIVE ");
        search.setUploadedFrom("2025-10-20");
        search.setUploadedTo("2026-10-20");
        search.setFileType("PDF");
        when(dao.selectArchiveFileList(anyMap())).thenReturn(Collections.emptyList());
        when(dao.selectArchiveFileCount(anyMap())).thenReturn(0L);

        assertThat(service.listFiles(search, user).getResultCnt()).isZero();

        verify(dao).selectArchiveFileList(argThat((Map<String, Object> params) ->
                Long.valueOf(71L).equals(params.get("tenantId"))
                        && "manual".equals(params.get("keyword"))
                        && "INACTIVE".equals(params.get("folderCode"))
                        && "2025-10-20".equals(params.get("uploadedFrom"))
                        && "2026-10-20".equals(params.get("uploadedTo"))
                        && "PDF".equals(params.get("fileType"))
                        && Boolean.FALSE.equals(params.get("rootOnly"))
                        && !params.containsKey("offset")
                        && !params.containsKey("limit")));
        verify(dao).selectArchiveFileCount(anyMap());
        verifyNoInteractions(categories);
    }

    @Test
    void listFilesAllowsAnOpenDateBoundAndOmitsAllTypeFilter() throws Exception {
        ArchiveBoardFileSearchVO search = new ArchiveBoardFileSearchVO();
        search.setUploadedFrom("2026-01-01");
        search.setUploadedTo(" ");
        search.setFileType("ALL");
        when(dao.selectArchiveFileList(anyMap())).thenReturn(Collections.emptyList());
        when(dao.selectArchiveFileCount(anyMap())).thenReturn(0L);

        service.listFiles(search, user);

        verify(dao).selectArchiveFileList(argThat((Map<String, Object> params) ->
                Long.valueOf(71L).equals(params.get("tenantId"))
                        && Boolean.TRUE.equals(params.get("rootOnly"))
                        && "2026-01-01".equals(params.get("uploadedFrom"))
                        && !params.containsKey("uploadedTo")
                        && !params.containsKey("fileType")
                        && !params.containsKey("offset")
                        && !params.containsKey("limit")));
    }

    @Test
    void listFilesRejectsInvalidDatesReversedRangeAndUnknownType() throws Exception {
        assertInvalidListSearch("2025-02-30", "", "ALL");
        assertInvalidListSearch("2026-10-21", "2026-10-20", "ALL");
        assertInvalidListSearch("", "", "AUDIO");
        verify(dao, never()).selectArchiveFileList(anyMap());
        verify(dao, never()).selectArchiveFileCount(anyMap());
    }

    private void assertInvalidListSearch(String from, String to, String fileType) throws Exception {
        ArchiveBoardFileSearchVO search = new ArchiveBoardFileSearchVO();
        search.setUploadedFrom(from);
        search.setUploadedTo(to);
        search.setFileType(fileType);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, () -> service.listFiles(search, user));
        assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void directUploadCreatesArchivePostWithFileNameTitle() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "manual.txt", "text/plain", new byte[] {1, 2});
        when(dao.insertArchivePost(anyMap())).thenReturn(44L);
        CommonFileVO uploaded = ownedFile(77L);
        uploaded.setOwnerId(44L);
        uploaded.setFileName("manual.txt");
        when(files.uploadFile(eq(71L), eq("ARCHIVE"), eq(44L), any(), eq("test-admin"))).thenReturn(uploaded);
        ArchiveBoardFileItemVO item = new ArchiveBoardFileItemVO();
        item.setBoardFileId(77L);
        when(dao.selectArchiveFileItemById(anyMap())).thenReturn(item);

        ArchiveBoardFileItemVO result = service.uploadFile(file, null, user);

        assertThat(result.getBoardFileId()).isEqualTo(77L);
        verify(dao).insertArchivePost(argThat((Map<String, Object> params) ->
                "manual.txt".equals(params.get("title"))
                        && params.get("categoryCode") == null
                        && "test-admin".equals(params.get("writerId"))
                        && "Test administrator".equals(params.get("writerName"))
                        && "test-admin".equals(params.get("lastModifiedBy"))
                        && "Test administrator".equals(params.get("lastModifiedByName"))));
    }

    @Test
    void updateFileRenamesAndMovesOwnedArchiveFile() throws Exception {
        ArchiveBoardFileVO attachment = new ArchiveBoardFileVO();
        attachment.setBoardFileId(31L);
        attachment.setTenantId(71L);
        attachment.setPostId(13L);
        attachment.setOwnerType("ARCHIVE");
        attachment.setFileUsageType("ATTACHMENT");
        attachment.setDeletedYn("N");
        when(dao.selectArchiveAttachmentById(anyMap())).thenReturn(attachment);
        when(files.listFiles(71L, "ARCHIVE", 13L)).thenReturn(Collections.singletonList(ownedFile(31L)));
        ArchiveBoardFileItemVO updated = new ArchiveBoardFileItemVO();
        updated.setBoardFileId(31L);
        updated.setFileName("renamed.txt");
        when(dao.selectArchiveFileItemById(anyMap())).thenReturn(updated);

        ArchiveBoardFileUpdateRequestVO request = new ArchiveBoardFileUpdateRequestVO();
        request.setPostId(13L);
        request.setFileName("renamed.txt");
        request.setFolderCode("GENERAL");

        ArchiveBoardFileItemVO result = service.updateFile(31L, request, user);

        assertThat(result.getFileName()).isEqualTo("renamed.txt");
        verify(categories).validate(71L, "ARCHIVE", "GENERAL");
        verify(dao).updateArchiveFileNameAndCategory(argThat((Map<String, Object> params) ->
                Long.valueOf(13L).equals(params.get("postId"))
                        && Long.valueOf(31L).equals(params.get("boardFileId"))
                        && "renamed.txt".equals(params.get("fileName"))
                        && "GENERAL".equals(params.get("categoryCode"))));
    }

    @Test
    void createAndUpdateKeepPlainTextAndAuthenticatedWriter() throws Exception {
        when(dao.insertArchivePost(anyMap())).thenReturn(13L);
        service.createPost(payload, user);
        service.updatePost(13L, payload, user);
        ArgumentCaptor<Map<String, Object>> params = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertArchivePost(params.capture());
        assertThat(params.getValue()).containsEntry("tenantId", 71L).containsEntry("boardTypeCode", "ARCHIVE")
                .containsEntry("contents", payload.getContents()).containsEntry("contentsText", payload.getContents())
                .containsEntry("writerId", "test-admin").containsEntry("title", "Manual")
                .containsEntry("categoryCode", "GENERAL");
        verify(dao).updateArchivePost(argThat(map -> payload.getContents().equals(map.get("contents"))
                && payload.getContents().equals(map.get("contentsText")) && Long.valueOf(71).equals(map.get("tenantId"))));
        verify(categories, times(2)).validate(71L, "ARCHIVE", "GENERAL");
    }

    @Test
    void categoryRejectionsStopWritesAndFilteredReads() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST))
                .when(categories).validate(71L, "ARCHIVE", "GENERAL");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createPost(payload, user));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.updatePost(13L, payload, user));
        ArchiveBoardPostSearchVO search = new ArchiveBoardPostSearchVO();
        search.setCategoryCode("GENERAL");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.listPosts(search, user));
        verify(dao, never()).insertArchivePost(anyMap());
        verify(dao, never()).updateArchivePost(anyMap());
        verify(dao, never()).selectArchivePostList(anyMap());
    }

    @Test
    void missingPayloadFieldsAndEmptyUploadAreClientErrors() throws Exception {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createPost(null, user));
        payload.setTitle(" ");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createPost(payload, user));
        payload.setTitle("Manual");
        payload.setCategoryCode(null);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.updatePost(13L, payload, user));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.uploadAttachment(13L,
                new MockMultipartFile("file", new byte[0]), user));
        verifyNoInteractions(files);
    }

    @Test
    void titleMustFitTheVerifiedDatabaseLimit() throws Exception {
        payload.setTitle(String.join("", Collections.nCopies(201, "x")));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createPost(payload, user));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.updatePost(13L, payload, user));
        verify(dao, never()).insertArchivePost(anyMap());
        verify(dao, never()).updateArchivePost(anyMap());
    }

    @Test
    void realValidatorAcceptsArchiveCategoryAndRejectsInactiveWrongGroupAndUnknown() throws Exception {
        CommonCodeGroupDAO groups = mock(CommonCodeGroupDAO.class);
        CommonCodeItemDAO items = mock(CommonCodeItemDAO.class);
        service = new ArchiveBoardServiceImpl(dao, files, new CommunityCategoryValidator(groups, items));
        CommonCodeGroupVO group = new CommonCodeGroupVO();
        group.setCommonCodeGroupId(202L);
        group.setGroupCode("WF_ARCHIVE_CATEGORY");
        group.setUseAt("Y");
        CommonCodeItemVO item = new CommonCodeItemVO();
        item.setGroupId(202L);
        item.setItemCode("GENERAL");
        item.setUseAt("Y");
        when(groups.selectGroupList(anyMap())).thenReturn(Collections.singletonList(group));
        when(items.selectItemList(anyMap())).thenReturn(Collections.singletonList(item));
        when(dao.insertArchivePost(anyMap())).thenReturn(13L);
        service.createPost(payload, user);
        verify(groups).selectGroupList(org.mockito.ArgumentMatchers.<Map<String, Object>>argThat(
                map -> Long.valueOf(71).equals(map.get("tenantId"))
                && "WF_ARCHIVE_CATEGORY".equals(map.get("groupCode"))));
        verify(items).selectItemList(argThat(map -> Long.valueOf(71).equals(map.get("tenantId"))
                && Long.valueOf(202).equals(map.get("groupId"))));
        item.setUseAt("N");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.updatePost(13L, payload, user));
        item.setUseAt("Y");
        item.setGroupId(101L);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createPost(payload, user));
        item.setGroupId(202L);
        item.setItemCode("OTHER");
        ArchiveBoardPostSearchVO search = new ArchiveBoardPostSearchVO();
        search.setCategoryCode("GENERAL");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.listPosts(search, user));
        group.setUseAt("N");
        item.setItemCode("GENERAL");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.updatePost(13L, payload, user));
        payload.setCategoryCode(" ");
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.createPost(payload, user));
        verify(dao, times(1)).insertArchivePost(anyMap());
        verify(dao, never()).updateArchivePost(anyMap());
    }

    @Test
    void detailIncludesOnlyActiveOwnedOrdinaryAttachmentMetadata() throws Exception {
        CommonFileVO ordinary = ownedFile(31L);
        ordinary.setFileName("manual.txt");
        CommonFileVO embedded = ownedFile(32L);
        embedded.setFileUsageType("EMBEDDED");
        CommonFileVO wrongPost = ownedFile(33L);
        wrongPost.setOwnerId(99L);
        CommonFileVO wrongOwner = ownedFile(34L);
        wrongOwner.setOwnerType("NOTICE");
        when(files.listFiles(71L, "ARCHIVE", 13L))
                .thenReturn(Arrays.asList(ordinary, embedded, wrongPost, wrongOwner));
        ArchiveBoardPostVO result = service.getPost(13L, user);
        assertThat(result.getAttachmentCount()).isEqualTo(1L);
        assertThat(result.getAttachments()).hasSize(1);
        assertThat(result.getAttachments().get(0).getBoardFileId()).isEqualTo(31L);
        assertThat(result.getAttachments().get(0).getFileName()).isEqualTo("manual.txt");
    }

    @Test
    void everyMutationRequiresAdminAndEnabledBoard() throws Exception {
        user.setRoleCode("MEMBER");
        for (Action action : mutations()) {
            assertStatus(HttpStatus.FORBIDDEN, action);
        }
        verifyNoInteractions(files);
        user.setRoleCode("ADMIN");
        config.put("useYn", "N");
        for (Action action : mutations()) {
            assertStatus(HttpStatus.FORBIDDEN, action);
        }
        config.put("useYn", "Y");
        config.put("writeAuthLevel", "NONE");
        assertStatus(HttpStatus.FORBIDDEN, () -> service.createPost(payload, user));
    }

    @Test
    void uploadChecksUploadPolicyAndUsesCommonArchiveOwner() throws Exception {
        config.put("fileUploadYn", "N");
        assertStatus(HttpStatus.FORBIDDEN, () -> service.uploadAttachment(13L, upload(), user));
        verifyNoInteractions(files);
        config.put("fileUploadYn", "Y");
        CommonFileVO uploaded = ownedFile(31L);
        when(files.uploadFile(eq(71L), eq("ARCHIVE"), eq(13L), any(), eq("test-admin"))).thenReturn(uploaded);
        assertThat(service.uploadAttachment(13L, upload(), user).getBoardFileId()).isEqualTo(31L);
        when(files.uploadFile(eq(71L), eq("ARCHIVE"), eq(13L), any(), eq("test-admin"))).thenReturn(null);
        assertStatus(HttpStatus.INTERNAL_SERVER_ERROR, () -> service.uploadAttachment(13L, upload(), user));
    }

    @Test
    void uploadLocksTenantPostBeforeWritingFileStorage() throws Exception {
        when(files.uploadFile(eq(71L), eq("ARCHIVE"), eq(13L), any(), eq("test-admin")))
                .thenReturn(ownedFile(31L));

        service.uploadAttachment(13L, upload(), user);

        InOrder order = inOrder(dao, files);
        order.verify(dao).selectArchivePostForUpdate(argThat(map -> Long.valueOf(71).equals(map.get("tenantId"))
                && Long.valueOf(13).equals(map.get("postId"))));
        order.verify(files).uploadFile(eq(71L), eq("ARCHIVE"), eq(13L), any(), eq("test-admin"));
        verify(dao, never()).selectArchivePostById(anyMap());
    }

    @Test
    void deleteCleansOnlyOwnedActiveOrdinaryFilesBeforeSoftDelete() throws Exception {
        CommonFileVO ordinary = ownedFile(31L);
        CommonFileVO embedded = ownedFile(32L);
        embedded.setFileUsageType("EMBEDDED");
        CommonFileVO wrongTenant = ownedFile(33L);
        wrongTenant.setTenantId(999L);
        CommonFileVO deleted = ownedFile(34L);
        deleted.setDeletedYn("Y");
        when(files.listFiles(71L, "ARCHIVE", 13L))
                .thenReturn(Arrays.asList(ordinary, embedded, wrongTenant, deleted));
        service.deletePost(13L, user);
        verify(files).deleteFile(71L, "ARCHIVE", 13L, 31L);
        verify(files, times(1)).deleteFile(anyLong(), anyString(), anyLong(), anyLong());
        verify(dao).softDeleteArchivePost(argThat(map -> Long.valueOf(71).equals(map.get("tenantId"))
                && Long.valueOf(13).equals(map.get("postId")) && "ARCHIVE".equals(map.get("boardTypeCode"))));
    }

    @Test
    void deleteLocksTenantPostBeforeListingAndRemovingAttachments() throws Exception {
        when(files.listFiles(71L, "ARCHIVE", 13L)).thenReturn(Collections.singletonList(ownedFile(31L)));

        service.deletePost(13L, user);

        InOrder order = inOrder(dao, files);
        order.verify(dao).selectArchivePostForUpdate(argThat(map -> Long.valueOf(71).equals(map.get("tenantId"))
                && Long.valueOf(13).equals(map.get("postId"))));
        order.verify(files).listFiles(71L, "ARCHIVE", 13L);
        order.verify(files).deleteFile(71L, "ARCHIVE", 13L, 31L);
        order.verify(dao).softDeleteArchivePost(anyMap());
        verify(dao, never()).selectArchivePostById(anyMap());
    }

    @Test
    void wrongTenantPostOwnerEmbeddedOrDeletedFileCannotBeRemovedOrDownloaded() throws Exception {
        for (int variant = 0; variant < 5; variant++) {
            ArchiveBoardFileVO file = new ArchiveBoardFileVO();
            file.setBoardFileId(31L);
            file.setTenantId(variant == 0 ? 999L : 71L);
            file.setPostId(variant == 1 ? 99L : 13L);
            file.setOwnerType(variant == 2 ? "NOTICE" : "ARCHIVE");
            file.setFileUsageType(variant == 3 ? "EMBEDDED" : "ATTACHMENT");
            file.setDeletedYn(variant == 4 ? "Y" : "N");
            when(dao.selectArchiveAttachmentById(anyMap())).thenReturn(file);
            assertStatus(HttpStatus.NOT_FOUND, () -> service.deleteAttachment(13L, 31L, user));
            assertStatus(HttpStatus.NOT_FOUND, () -> service.downloadAttachment(13L, 31L,
                    new MockHttpServletResponse(), user));
        }
        verify(files, never()).deleteFile(anyLong(), anyString(), anyLong(), anyLong());
        verify(files, never()).downloadFile(anyLong(), anyString(), anyLong(), anyLong(), any());
    }

    @Test
    void validRemoveAndDownloadCarryFullOwnerScopeAndDownloadAllowsMember() throws Exception {
        ArchiveBoardFileVO file = new ArchiveBoardFileVO();
        file.setBoardFileId(31L);
        file.setTenantId(71L);
        file.setPostId(13L);
        file.setOwnerType("ARCHIVE");
        file.setFileUsageType("ATTACHMENT");
        file.setDeletedYn("N");
        when(dao.selectArchiveAttachmentById(anyMap())).thenReturn(file);
        service.deleteAttachment(13L, 31L, user);
        verify(files).deleteFile(71L, "ARCHIVE", 13L, 31L);
        user.setRoleCode("MEMBER");
        MockHttpServletResponse response = new MockHttpServletResponse();
        service.downloadAttachment(13L, 31L, response, user);
        verify(files).downloadFile(71L, "ARCHIVE", 13L, 31L, response);
        verify(dao, times(2)).selectArchiveAttachmentById(argThat(map ->
                Long.valueOf(71).equals(map.get("tenantId")) && Long.valueOf(13).equals(map.get("postId"))
                && Long.valueOf(31).equals(map.get("boardFileId")) && "ARCHIVE".equals(map.get("boardTypeCode"))));
    }

    @Test
    void deletingLastAttachmentAlsoSoftDeletesPost() throws Exception {
        ArchiveBoardFileVO file = new ArchiveBoardFileVO();
        file.setBoardFileId(31L);
        file.setTenantId(71L);
        file.setPostId(13L);
        file.setOwnerType("ARCHIVE");
        file.setFileUsageType("ATTACHMENT");
        file.setDeletedYn("N");
        when(dao.selectArchiveAttachmentById(anyMap())).thenReturn(file);
        when(files.listFiles(71L, "ARCHIVE", 13L)).thenReturn(Collections.emptyList());

        service.deleteAttachment(13L, 31L, user);

        verify(dao).softDeleteArchivePost(argThat(params ->
                Long.valueOf(13L).equals(params.get("postId"))
                        && Long.valueOf(71L).equals(params.get("tenantId"))));
    }

    @Test
    void missingPostAuthenticationAndStorageFailuresAreNotSuccess() throws Exception {
        assertStatus(HttpStatus.UNAUTHORIZED, () -> service.listPosts(new ArchiveBoardPostSearchVO(), null));
        when(dao.selectArchivePostById(anyMap())).thenReturn(null);
        when(dao.selectArchivePostForUpdate(anyMap())).thenReturn(null);
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getPost(13L, user));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.deletePost(13L, user));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.uploadAttachment(13L, upload(), user));
        verifyNoInteractions(files);
        when(dao.selectArchivePostById(anyMap())).thenReturn(new ArchiveBoardPostVO());
        when(dao.selectArchivePostForUpdate(anyMap())).thenReturn(new ArchiveBoardPostVO());
        doThrow(new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR)).when(files)
                .listFiles(71L, "ARCHIVE", 13L);
        assertStatus(HttpStatus.INTERNAL_SERVER_ERROR, () -> service.getPost(13L, user));
        assertStatus(HttpStatus.INTERNAL_SERVER_ERROR, () -> service.deletePost(13L, user));
        verify(dao, never()).softDeleteArchivePost(anyMap());
    }

    private List<Action> mutations() {
        return Arrays.asList(() -> service.createPost(payload, user), () -> service.updatePost(13L, payload, user),
                () -> service.deletePost(13L, user), () -> service.uploadAttachment(13L, upload(), user),
                () -> service.deleteAttachment(13L, 31L, user));
    }

    private MockMultipartFile upload() {
        return new MockMultipartFile("file", "manual.txt", "text/plain", new byte[] {1});
    }

    private CommonFileVO ownedFile(Long id) {
        CommonFileVO file = new CommonFileVO();
        file.setFileId(id);
        file.setTenantId(71L);
        file.setOwnerType("ARCHIVE");
        file.setOwnerId(13L);
        file.setFileUsageType("ATTACHMENT");
        file.setDeletedYn("N");
        return file;
    }

    private void assertStatus(HttpStatus expected, Action action) {
        assertThat(assertThrows(ResponseStatusException.class, action::run).getStatus()).isEqualTo(expected);
    }

    private interface Action {
        void run() throws Exception;
    }
}
