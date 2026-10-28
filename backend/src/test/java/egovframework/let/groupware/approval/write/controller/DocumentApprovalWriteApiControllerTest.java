package egovframework.let.groupware.approval.write.controller;


import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import egovframework.com.cmm.LoginVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.shared.controller.DocumentApprovalInteractionApiController;
import egovframework.let.groupware.approval.write.controller.DocumentApprovalWriteApiController;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalEmbeddedImageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalDraftVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalFeedItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalPinStateVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalWritePageVO;
import egovframework.let.groupware.approval.shared.service.DocumentApprovalInteractionService;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;
class DocumentApprovalWriteApiControllerTest {

    private final DocumentApprovalInteractionService interactionService =
            mock(DocumentApprovalInteractionService.class);
    private final DocumentApprovalWriteService writeService = mock(DocumentApprovalWriteService.class);
    private final DocumentApprovalInteractionApiController controller =
            new DocumentApprovalInteractionApiController(new ResultVoHelper(), interactionService);
    private final DocumentApprovalWriteApiController writeController =
            new DocumentApprovalWriteApiController(new ResultVoHelper(), writeService);

    @Test
    void listDocumentsKeepsLightweightResponseByDefault() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalListItemVO listItem = new DocumentApprovalListItemVO();
        listItem.setElectronicApprovalId(77L);
        List<DocumentApprovalListItemVO> list = Collections.singletonList(listItem);
        when(writeService.listDocuments(user, "ALL", null, null)).thenReturn(list);

        ResultVO response = writeController.listDocuments(
                "ALL", null, false, new DocumentApprovalListQueryVO(), user);

        assertThat(response.getResult().get("resultList")).isSameAs(list);
        assertThat(response.getResult()).doesNotContainKey("totalRowCount");
        verify(writeService).listDocuments(user, "ALL", null, null);
    }

    @Test
    void listDocumentsReturnsDetailedRowsWhenRequested() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalFeedItemVO feedItem = new DocumentApprovalFeedItemVO();
        feedItem.setElectronicApprovalId(77L);
        List<DocumentApprovalFeedItemVO> feed = Collections.singletonList(feedItem);
        when(writeService.listFeedDocuments(user, "ALL", null, null)).thenReturn(feed);

        ResultVO response = writeController.listDocuments(
                "ALL", null, true, new DocumentApprovalListQueryVO(), user);

        assertThat(response.getResult().get("resultList")).isSameAs(feed);
        assertThat(response.getResult()).doesNotContainKey("totalRowCount");
        verify(writeService).listFeedDocuments(user, "ALL", null, null);
    }

    @Test
    void listDocumentsReturnsResultListAndTotalForRemoteQuery() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalListItemVO row = new DocumentApprovalListItemVO();
        row.setElectronicApprovalId(77L);
        DocumentApprovalWritePageVO<DocumentApprovalListItemVO> page = new DocumentApprovalWritePageVO<>();
        page.setResultList(Collections.singletonList(row));
        page.setTotalRowCount(42L);
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setOffset(0);
        query.setLimit(25);
        when(writeService.searchWriteDocuments(user, "ALL", query)).thenReturn(page);

        ResultVO response = writeController.listDocuments("ALL", null, false, query, user);

        assertThat(response.getResult())
                .containsEntry("resultList", page.getResultList())
                .containsEntry("totalRowCount", 42L);
        verify(writeService).searchWriteDocuments(user, "ALL", query);
    }

    @Test
    void pinAndUnpinRoutesDelegateAuthenticatedActorAndReturnStateItem() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalPinStateVO pinned = new DocumentApprovalPinStateVO();
        pinned.setElectronicApprovalId(77L);
        pinned.setPinned(true);
        DocumentApprovalPinStateVO unpinned = new DocumentApprovalPinStateVO();
        unpinned.setElectronicApprovalId(77L);
        unpinned.setPinned(false);
        when(writeService.pinDocument(user, 77L)).thenReturn(pinned);
        when(writeService.unpinDocument(user, 77L)).thenReturn(unpinned);

        assertWriteRoute("pinDocument", PutMapping.class, "/documents/{electronicApprovalId}/pin");
        assertWriteRoute("unpinDocument", DeleteMapping.class, "/documents/{electronicApprovalId}/pin");

        ResultVO pinResponse = writeController.pinDocument(77L, user);
        ResultVO unpinResponse = writeController.unpinDocument(77L, user);

        assertThat(pinResponse.getResult().get("item")).isSameAs(pinned);
        assertThat(unpinResponse.getResult().get("item")).isSameAs(unpinned);
        verify(writeService).pinDocument(user, 77L);
        verify(writeService).unpinDocument(user, 77L);
    }

    @Test
    void listPinnedDocumentsReturnsFilteredListAndTotalCount() throws Exception {
        LoginVO user = authenticatedUser();
        DocumentApprovalListItemVO pinned = new DocumentApprovalListItemVO();
        pinned.setElectronicApprovalId(77L);
        DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
        query.setDocumentType("DRAFTING");
        when(writeService.listPinnedDocuments(user, "MY_PENDING", "DRAFTING", 77L))
                .thenReturn(Collections.singletonList(pinned));

        ResultVO response = writeController.listPinnedDocuments("MY_PENDING", 77L, false, query, user);

        assertWriteRoute("listPinnedDocuments", GetMapping.class, "/documents/pinned");
        assertThat(response.getResult())
                .containsEntry("resultList", Collections.singletonList(pinned))
                .containsEntry("totalRowCount", 1L);
        verify(writeService).listPinnedDocuments(user, "MY_PENDING", "DRAFTING", 77L);
    }

    @Test
    void createDraftReturnsCreatedDocumentIdentity() throws Exception {
        LoginVO user = new LoginVO();
        DocumentApprovalDraftSaveRequestVO request = new DocumentApprovalDraftSaveRequestVO();
        DocumentApprovalDraftVO saved = new DocumentApprovalDraftVO();
        saved.setElectronicApprovalId(77L);
        saved.setDocumentStatus("DRAFT");
        when(writeService.saveDraft(user, request)).thenReturn(saved);

        ResponseEntity<ResultVO> response = writeController.createDraft(request, user);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        DocumentApprovalDraftVO item = (DocumentApprovalDraftVO) response.getBody().getResult().get("item");
        assertThat(item.getElectronicApprovalId()).isEqualTo(77L);
        assertThat(item.getDocumentStatus()).isEqualTo("DRAFT");
        verify(writeService).saveDraft(user, request);
    }

    @Test
    void uploadTemporaryEmbeddedImageReturnsCreatedItem() throws Exception {
        LoginVO user = authenticatedUser();
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", new byte[] {1, 2, 3});
        EmbeddedImageUploadVO uploaded = new EmbeddedImageUploadVO();
        uploaded.setUploadToken("token");
        uploaded.setFileName("image.png");
        when(writeService.uploadTemporaryEmbeddedImage(user, file)).thenReturn(uploaded);

        ResponseEntity<ResultVO> response = writeController.uploadTemporaryEmbeddedImage(file, user);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getResult().get("item")).isSameAs(uploaded);
        verify(writeService).uploadTemporaryEmbeddedImage(user, file);
    }

    @Test
    void deleteTemporaryEmbeddedImageDelegatesTokenAndFileName() throws Exception {
        LoginVO user = authenticatedUser();

        writeController.deleteTemporaryEmbeddedImage("token", "image.png", user);

        verify(writeService).deleteTemporaryEmbeddedImage(user, "token", "image.png");
    }

    @Test
    void numericImageWidthCanBeReadIntoStringMetadata() throws Exception {
        DocumentApprovalEmbeddedImageVO image = new ObjectMapper().readValue(
                "{\"width\":320}",
                DocumentApprovalEmbeddedImageVO.class);

        assertThat(image.getWidth()).isEqualTo("320");
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
