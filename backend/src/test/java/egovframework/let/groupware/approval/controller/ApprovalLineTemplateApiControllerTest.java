package egovframework.let.groupware.approval.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateRenameRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateVO;
import egovframework.let.groupware.approval.service.ApprovalLineTemplateService;

class ApprovalLineTemplateApiControllerTest {

    private final ApprovalLineTemplateService templateService = mock(ApprovalLineTemplateService.class);
    private final ApprovalLineTemplateApiController controller =
            new ApprovalLineTemplateApiController(new ResultVoHelper(), templateService);

    @Test
    void listTemplatesReturnsOwnedTemplateList() throws Exception {
        LoginVO user = authenticatedUser();
        List<ApprovalLineTemplateVO> templates = Collections.singletonList(new ApprovalLineTemplateVO());
        when(templateService.listTemplates(user, "001")).thenReturn(templates);

        ResultVO response = controller.listTemplates("001", user);

        assertThat(response.getResult().get("resultList")).isSameAs(templates);
        verify(templateService).listTemplates(user, "001");
    }

    @Test
    void getTemplateReturnsTemplateItem() throws Exception {
        LoginVO user = authenticatedUser();
        ApprovalLineTemplateVO template = new ApprovalLineTemplateVO();
        template.setTemplateId(7L);
        when(templateService.getTemplate(user, 7L)).thenReturn(template);

        ResultVO response = controller.getTemplate(7L, user);

        assertThat(response.getResult().get("item")).isSameAs(template);
        verify(templateService).getTemplate(user, 7L);
    }

    @Test
    void createTemplateReturnsCreatedItem() throws Exception {
        LoginVO user = authenticatedUser();
        ApprovalLineTemplateSaveRequestVO request = new ApprovalLineTemplateSaveRequestVO();
        ApprovalLineTemplateVO saved = new ApprovalLineTemplateVO();
        saved.setTemplateId(7L);
        when(templateService.createTemplate(user, request)).thenReturn(saved);

        ResponseEntity<ResultVO> response = controller.createTemplate(request, user);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getResult().get("item")).isSameAs(saved);
        verify(templateService).createTemplate(user, request);
    }

    @Test
    void renameTemplateReturnsUpdatedItem() throws Exception {
        LoginVO user = authenticatedUser();
        ApprovalLineTemplateRenameRequestVO request = new ApprovalLineTemplateRenameRequestVO();
        ApprovalLineTemplateVO renamed = new ApprovalLineTemplateVO();
        renamed.setTemplateId(7L);
        when(templateService.renameTemplate(user, 7L, request)).thenReturn(renamed);

        ResultVO response = controller.renameTemplate(7L, request, user);

        assertThat(response.getResult().get("item")).isSameAs(renamed);
        verify(templateService).renameTemplate(user, 7L, request);
    }

    @Test
    void deleteTemplateReturnsSuccessMessage() throws Exception {
        LoginVO user = authenticatedUser();

        ResultVO response = controller.deleteTemplate(7L, user);

        assertThat(response.getResultCode()).isEqualTo(ResponseCode.SUCCESS.getCode());
        assertThat(response.getResult().get("message")).isEqualTo("자주 쓰는 결재선이 삭제되었습니다.");
        verify(templateService).deleteTemplate(user, 7L);
    }

    @Test
    void templateRoutesAreAvailableUnderTemplateResource() {
        assertRoute("listTemplates", GetMapping.class, "");
        assertRoute("getTemplate", GetMapping.class, "/{templateId}");
        assertRoute("createTemplate", PostMapping.class, "");
        assertRoute("renameTemplate", PutMapping.class, "/{templateId}");
        assertRoute("deleteTemplate", DeleteMapping.class, "/{templateId}");
        assertThat(ApprovalLineTemplateApiController.class.getAnnotation(
                org.springframework.web.bind.annotation.RequestMapping.class).value())
                .containsExactly("/api/v1/groupware/approvals/line-templates");
    }

    private void assertRoute(String methodName, Class<? extends Annotation> mappingType, String expectedPath) {
        Method method = Arrays.stream(ApprovalLineTemplateApiController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElse(null);
        assertThat(method).as("controller method %s exists", methodName).isNotNull();
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
        if (expectedPath.isEmpty()) {
            assertThat(paths).isEmpty();
        } else {
            assertThat(paths).contains(expectedPath);
        }
    }

    private LoginVO authenticatedUser() {
        LoginVO user = new LoginVO();
        user.setTenantId(4L);
        user.setId("login-author");
        user.setUniqId("101");
        return user;
    }
}
