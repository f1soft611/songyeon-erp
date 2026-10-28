package egovframework.let.groupware.approval.shared.controller;


import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import javax.servlet.http.HttpServletResponse;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.shared.controller.DocumentApprovalInteractionApiController;
import egovframework.let.groupware.approval.write.controller.DocumentApprovalWriteApiController;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalCommentPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalInteractionService;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFilePageVO;
class DocumentApprovalInteractionApiControllerTest {

    private final DocumentApprovalInteractionService interactionService =
            mock(DocumentApprovalInteractionService.class);
    private final DocumentApprovalWriteService writeService = mock(DocumentApprovalWriteService.class);
    private final DocumentApprovalInteractionApiController controller =
            new DocumentApprovalInteractionApiController(new ResultVoHelper(), interactionService);
    private final DocumentApprovalWriteApiController writeController =
            new DocumentApprovalWriteApiController(new ResultVoHelper(), writeService);

    @Test
    void filePageUsesAuthenticatedUserAndExistingResultEnvelope() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalFilePageVO page = new DocumentApprovalFilePageVO();
        page.setResultList(Collections.emptyList());
        when(interactionService.listFiles(user, "ALL", null, null, 55L)).thenReturn(page);
        ResultVO response = controller.listFiles("ALL", null, null, 55L, user);
        assertThat(response.getResult())
                .containsEntry("resultList", page.getResultList())
                .containsEntry("hasNext", false)
                .containsEntry("nextBeforeFileId", null);
        Method method = DocumentApprovalInteractionApiController.class.getMethod("listFiles",
                String.class, String.class, Long.class, Long.class, LoginVO.class);
        assertThat(method.getAnnotation(GetMapping.class).value()).containsExactly("/files");
        verify(interactionService).listFiles(user, "ALL", null, null, 55L);
    }

    @Test
    void listApprovalCommentsReturnsTheUnifiedPageContract() throws Exception {
        LoginVO user = authenticatedUser();
        CommonCommentVO comment = new CommonCommentVO();
        comment.setCommentId(104L);
        CommonCommentVO systemEvent = new CommonCommentVO();
        systemEvent.setCommentId(103L);
        DocumentApprovalCommentPageVO page = new DocumentApprovalCommentPageVO();
        page.setComments(Collections.singletonList(comment));
        page.setSystemEvents(Collections.singletonList(systemEvent));
        page.setResultCnt(4L);
        page.setHasPrevious(true);
        page.setNextBeforeCommentId(103L);
        when(interactionService.listApprovalComments(user, 77L, 3, 103L)).thenReturn(page);

        ResultVO response = controller.listApprovalComments(77L, 3, 103L, user);

        assertThat(response.getResult())
            .containsEntry("resultList", page.getComments())
            .containsEntry("comments", page.getComments())
            .containsEntry("systemEvents", page.getSystemEvents())
            .containsEntry("resultCnt", 4L)
            .containsEntry("hasPrevious", true)
            .containsEntry("nextBeforeCommentId", 103L);
        verify(interactionService).listApprovalComments(user, 77L, 3, 103L);
    }

    @Test
    void submitRouteReturnsCreatedResponse() throws Exception {
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();

        mockMvc.perform(post("/api/v1/groupware/approvals/77/submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isOk());
    }

    @Test
    void streamEmbeddedImageDelegatesApprovalAndFileIdentity() throws Exception {
        LoginVO user = authenticatedUser();
        HttpServletResponse response = mock(HttpServletResponse.class);

        controller.streamEmbeddedImage(77L, 91L, user, response);

        verify(interactionService).streamEmbeddedImage(user, 77L, 91L, response);
    }

    @Test
    void approvalCommentAndAttachmentRoutesIncludeApprovalAndCommentIds() {
        assertRoute("listApprovalComments", GetMapping.class, "/{electronicApprovalId}/comments");
        assertRoute("createApprovalComment", PostMapping.class, "/{electronicApprovalId}/comments");
        assertRoute("updateApprovalComment", PutMapping.class,
                "/{electronicApprovalId}/comments/{commentId}");
        assertRoute("deleteApprovalComment", DeleteMapping.class,
                "/{electronicApprovalId}/comments/{commentId}");
        assertRoute("listApprovalCommentAttachments", GetMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments");
        assertRoute("uploadApprovalCommentAttachment", PostMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments");
        assertRoute("downloadApprovalCommentAttachment", GetMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments/{fileId}/download");
        assertRoute("deleteApprovalCommentAttachment", DeleteMapping.class,
                "/{electronicApprovalId}/comments/{commentId}/attachments/{fileId}");
    }

    @Test
    void documentDeleteRouteIsAvailableAtApprovalRoot() {
        assertRoute("deleteDocumentApproval", DeleteMapping.class, "/{electronicApprovalId}");
    }

    @Test
    void cancellationRoutesDelegateAndReturnWorkflowItems() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalDraftVO submission = new DocumentApprovalDraftVO();
        submission.setElectronicApprovalId(77L);
        submission.setDocumentStatus("DRAFT");
        DocumentApprovalDraftVO approval = new DocumentApprovalDraftVO();
        approval.setElectronicApprovalId(77L);
        approval.setDocumentStatus("IN_PROGRESS");
        when(interactionService.cancelSubmission(user, 77L)).thenReturn(submission);
        when(interactionService.cancelApproval(user, 77L)).thenReturn(approval);

        assertRoute("cancelSubmission", PostMapping.class, "/{electronicApprovalId}/submission-cancellation");
        assertRoute("cancelApproval", PostMapping.class, "/{electronicApprovalId}/approval-cancellation");

        ResultVO submissionResponse = controller.cancelSubmission(77L, user);
        ResultVO approvalResponse = controller.cancelApproval(77L, user);

        assertThat(submissionResponse.getResult().get("item")).isSameAs(submission);
        assertThat(approvalResponse.getResult().get("item")).isSameAs(approval);
        verify(interactionService).cancelSubmission(user, 77L);
        verify(interactionService).cancelApproval(user, 77L);
    }



    private void assertRoute(String methodName, Class<? extends Annotation> mappingType, String expectedPath) {
        Method method = findMethod(DocumentApprovalInteractionApiController.class, methodName);
        assertThat(method).as("controller method %s exists", methodName).isNotNull();
        assertMapping(method, methodName, mappingType, expectedPath);
    }

    private void assertWriteRoute(String methodName, Class<? extends Annotation> mappingType, String expectedPath) {
        Method method = findMethod(DocumentApprovalWriteApiController.class, methodName);
        assertThat(method).as("controller method %s exists", methodName).isNotNull();
        assertMapping(method, methodName, mappingType, expectedPath);
    }

    private Method findMethod(Class<?> controllerType, String methodName) {
        return Arrays.stream(controllerType.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElse(null);
    }

    private void assertMapping(Method method, String methodName,
            Class<? extends Annotation> mappingType, String expectedPath) {
        Annotation mapping = method.getAnnotation(mappingType);
        assertThat(mapping).as("%s has %s", methodName, mappingType.getSimpleName()).isNotNull();
        String[] paths;
        if (mapping instanceof GetMapping) {
            paths = ((GetMapping) mapping).value();
        } else if (mapping instanceof PostMapping) {
            paths = ((PostMapping) mapping).value();
        } else if (mapping instanceof PutMapping) {
            paths = ((PutMapping) mapping).value();
        } else {
            paths = ((DeleteMapping) mapping).value();
        }
        assertThat(paths).contains(expectedPath);
    }

    private LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("101");
        user.setName("작성자");
        return user;
    }
}
