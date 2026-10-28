package egovframework.com.common.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;

class CommonFileApiControllerTest {

    @Test
    void genericFileEndpointsRejectApprovalOwnerType() {
        CommonFileApiController controller = new CommonFileApiController(null, null);
        LoginVO user = new LoginVO();
        user.setTenantId(1L);

        assertForbidden(() -> controller.listFiles("APPROVAL", 10L, user));
        assertForbidden(() -> controller.uploadFile(
            "APPROVAL",
            10L,
            null,
            new MockMultipartFile("file", "draft.txt", "text/plain", "body".getBytes()),
            user));
        assertForbidden(() -> controller.deleteFile(20L, "APPROVAL", 10L, user));
        assertForbidden(() -> controller.downloadFile(
            20L, "APPROVAL", 10L, user, new MockHttpServletResponse()));
        assertForbidden(() -> controller.listFiles("APPROVAL_COMMENT", 20L, user));
        assertForbidden(() -> controller.uploadFile(
            "APPROVAL_COMMENT",
            20L,
            null,
            new MockMultipartFile("file", "comment.txt", "text/plain", "body".getBytes()),
            user));
        assertForbidden(() -> controller.deleteFile(21L, "APPROVAL_COMMENT", 20L, user));
        assertForbidden(() -> controller.downloadFile(
            21L, "APPROVAL_COMMENT", 20L, user, new MockHttpServletResponse()));
    }

    private void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action)
            .isInstanceOfSatisfying(ResponseStatusException.class,
                exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
