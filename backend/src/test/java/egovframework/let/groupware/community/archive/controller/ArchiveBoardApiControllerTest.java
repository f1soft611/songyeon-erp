package egovframework.let.groupware.community.archive.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Collections;
import java.util.Objects;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.common.dto.ListResult;
import egovframework.let.groupware.community.archive.domain.model.*;
import egovframework.let.groupware.community.archive.service.ArchiveBoardService;

class ArchiveBoardApiControllerTest {
    private static final String ROOT = "/api/v1/groupware/boards/archive";
    private ArchiveBoardService service;
    private MockMvc mvc;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = mock(ArchiveBoardService.class);
        user = new LoginVO();
        user.setTenantId(71L);
        user.setId("test-user");
        user.setRoleCode("TENANT_ADMIN");
        mvc = MockMvcBuilders.standaloneSetup(new ArchiveBoardApiController(new ResultVoHelper(), service))
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.getParameterType() == LoginVO.class;
                    }
                    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                            NativeWebRequest request, WebDataBinderFactory factory) {
                        return user;
                    }
                }).build();
    }

    @Test
    void listDetailAndUpdateUseApprovedPathsStatusAndEnvelopes() throws Exception {
        ArchiveBoardPostVO post = new ArchiveBoardPostVO();
        post.setPostId(13L);
        when(service.listPosts(any(), eq(user))).thenReturn(new ListResult<>(Collections.singletonList(post), 1L));
        when(service.getPost(13L, user)).thenReturn(post);
        when(service.updatePost(eq(13L), any(), eq(user))).thenReturn(post);
        mvc.perform(get(ROOT + "/posts").param("pageIndex", "2").param("pageUnit", "5")
                .param("keyword", "manual").param("categoryCode", "GENERAL").param("tenantId", "999"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.resultCnt").value(1))
                .andExpect(jsonPath("$.result.resultList[0].postId").value(13));
        verify(service).listPosts(argThat(search -> search.getPageIndex() == 2 && search.getPageUnit() == 5
                && "manual".equals(search.getKeyword()) && "GENERAL".equals(search.getCategoryCode())
                && Long.valueOf(71).equals(search.getTenantId())), eq(user));
        mvc.perform(get(ROOT + "/posts/13")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.postId").value(13));
        mvc.perform(put(ROOT + "/posts/13").contentType(MediaType.APPLICATION_JSON).content(payload()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.item.postId").value(13));
        mvc.perform(delete(ROOT + "/posts/13")).andExpect(status().isOk())
                .andExpect(jsonPath("$.result.message").exists());
        verify(service).deletePost(13L, user);
    }

    @Test
    void fileListRouteBindsFiltersWithoutPagination() throws Exception {
        ArchiveBoardFileItemVO item = new ArchiveBoardFileItemVO();
        item.setBoardFileId(31L);
        when(service.listFiles(any(), eq(user))).thenReturn(new ListResult<>(Collections.singletonList(item), 1L));

        mvc.perform(get(ROOT + "/files").param("keyword", "manual").param("folderCode", "GENERAL")
                        .param("uploadedFrom", "2025-10-20").param("uploadedTo", "2026-10-20")
                        .param("fileType", "PDF"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.resultCnt").value(1))
                .andExpect(jsonPath("$.result.resultList[0].boardFileId").value(31));

        verify(service).listFiles(argThat(search ->
                "manual".equals(search.getKeyword())
                        && "GENERAL".equals(search.getFolderCode())
                        && Objects.equals("2025-10-20",
                                property(search, "uploadedFrom"))
                        && Objects.equals("2026-10-20",
                                property(search, "uploadedTo"))
                        && Objects.equals("PDF", property(search, "fileType"))
                        && property(search, "offset") == null
                        && property(search, "limit") == null), eq(user));
    }

    private Object property(ArchiveBoardFileSearchVO search, String name) {
        BeanWrapper bean = new BeanWrapperImpl(search);
        return bean.isReadableProperty(name) ? bean.getPropertyValue(name) : null;
    }

    @Test
    void directFileUploadRouteSupportsMultipartAndPostCreateRouteIsNotAvailable() throws Exception {
        ArchiveBoardFileItemVO item = new ArchiveBoardFileItemVO();
        item.setBoardFileId(55L);
        when(service.uploadFile(any(), any(), eq(user))).thenReturn(item);

        mvc.perform(multipart(ROOT + "/files").file(
                        new MockMultipartFile("file", "manual.txt", "text/plain", new byte[] {1}))
                        .param("folderCode", "GENERAL"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.result.item.boardFileId").value(55));

        verify(service).uploadFile(any(), eq("GENERAL"), eq(user));

        mvc.perform(post(ROOT + "/posts").contentType(MediaType.APPLICATION_JSON).content(payload()))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void fileUpdateRouteRenamesAndMovesFile() throws Exception {
        ArchiveBoardFileItemVO item = new ArchiveBoardFileItemVO();
        item.setBoardFileId(31L);
        item.setFileName("renamed.txt");
        when(service.updateFile(eq(31L), any(), eq(user))).thenReturn(item);

        mvc.perform(put(ROOT + "/files/31")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"postId\":13,\"fileName\":\"renamed.txt\",\"folderCode\":\"GENERAL\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.item.boardFileId").value(31))
                .andExpect(jsonPath("$.result.item.fileName").value("renamed.txt"));
    }

    @Test
    void attachmentRoutesRequirePostOwnershipParameterAndMultipartFile() throws Exception {
        ArchiveBoardFileVO attachment = new ArchiveBoardFileVO();
        attachment.setBoardFileId(31L);
        when(service.uploadAttachment(eq(13L), any(), eq(user))).thenReturn(attachment);
        mvc.perform(multipart(ROOT + "/posts/13/attachments").file(
                new MockMultipartFile("file", "manual.txt", "text/plain", new byte[] {1})))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.result.item.boardFileId").value(31));
        mvc.perform(delete(ROOT + "/attachments/31").param("postId", "13")).andExpect(status().isOk());
        verify(service).deleteAttachment(13L, 31L, user);
        mvc.perform(get(ROOT + "/attachments/31/download").param("postId", "13")).andExpect(status().isOk());
        verify(service).downloadAttachment(eq(13L), eq(31L), any(), eq(user));
        mvc.perform(delete(ROOT + "/attachments/31")).andExpect(status().isBadRequest());
        mvc.perform(get(ROOT + "/attachments/31/download")).andExpect(status().isBadRequest());
        mvc.perform(multipart(ROOT + "/posts/13/attachments")).andExpect(status().isBadRequest());
    }

    @Test
    void allRoutesRejectMissingAuthentication() throws Exception {
        user = null;
        mvc.perform(get(ROOT + "/posts")).andExpect(status().isUnauthorized());
        mvc.perform(get(ROOT + "/posts/13")).andExpect(status().isUnauthorized());
        mvc.perform(multipart(ROOT + "/files").file(
                new MockMultipartFile("file", "manual.txt", "text/plain", new byte[] {1})))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(ROOT + "/posts/13").contentType(MediaType.APPLICATION_JSON).content(payload()))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete(ROOT + "/posts/13")).andExpect(status().isUnauthorized());
        mvc.perform(multipart(ROOT + "/posts/13/attachments").file(
                new MockMultipartFile("file", new byte[] {1}))).andExpect(status().isUnauthorized());
        mvc.perform(delete(ROOT + "/attachments/31").param("postId", "13")).andExpect(status().isUnauthorized());
        mvc.perform(get(ROOT + "/attachments/31/download").param("postId", "13")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void serviceErrorsRemainErrorsInsteadOfSuccessEnvelopes() throws Exception {
        when(service.uploadFile(any(), any(), eq(user))).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        when(service.getPost(13L, user)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        mvc.perform(multipart(ROOT + "/files").file(
                new MockMultipartFile("file", "manual.txt", "text/plain", new byte[] {1})))
                .andExpect(status().isForbidden());
        mvc.perform(get(ROOT + "/posts/13")).andExpect(status().isNotFound());
        mvc.perform(multipart(ROOT + "/files"))
                .andExpect(status().isBadRequest());
    }

    private String payload() {
        return "{\"title\":\"Manual\",\"contents\":\"first\\nsecond\",\"categoryCode\":\"GENERAL\"}";
    }
}
