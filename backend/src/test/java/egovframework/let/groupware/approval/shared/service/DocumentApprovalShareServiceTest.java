package egovframework.let.groupware.approval.shared.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

import java.util.Collections;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListItemVO;
import egovframework.let.groupware.approval.write.service.DocumentApprovalWriteService;

class DocumentApprovalShareServiceTest {
    private final DocumentApprovalWriteService documents = mock(DocumentApprovalWriteService.class);
    private final DocumentApprovalShareService service =
            new DocumentApprovalShareService(documents, "unit-test-share-key-not-for-production-12345");
    private final LoginVO user = new LoginVO();
    private final DocumentApprovalListItemVO record = new DocumentApprovalListItemVO();

    @BeforeEach
    void setUp() throws Exception {
        user.setId("test-user");
        user.setTenantId(4L);
        record.setElectronicApprovalId(42L);
        record.setTitle("Readable document");
        when(documents.listDocuments(any(), eq("ALL"), isNull(), anyLong()))
                .thenReturn(Collections.singletonList(record));
    }

    @Test
    void encryptsWithFreshIvAndResolvesThroughExistingPermissions() throws Exception {
        String first = service.issue(user, 42L);
        String second = service.issue(user, 42L);
        assertThat(first).matches("v1\\.[A-Za-z0-9_-]{59}").isNotEqualTo(second);
        assertThat(service.resolve(user, first)).isSameAs(record);
        verify(documents, times(3)).listDocuments(user, "ALL", null, 42L);
    }

    @Test
    void rejectsTamperingAndMalformedTokens() throws Exception {
        String token = service.issue(user, 42L);
        String tampered = token.substring(0, 10) + (token.charAt(10) == 'A' ? "B" : "A") + token.substring(11);
        for (String value : new String[] {tampered, "v2." + token.substring(3), "42", token + "A"}) {
            assertNotFound(() -> service.resolve(user, value));
        }
        verify(documents).listDocuments(user, "ALL", null, 42L);
    }

    @Test
    void survivesServiceRecreationButRejectsTokensAfterKeyRotation() throws Exception {
        String token = service.issue(user, 42L);
        DocumentApprovalShareService restarted =
                new DocumentApprovalShareService(documents, "unit-test-share-key-not-for-production-12345");
        assertThat(restarted.resolve(user, token)).isSameAs(record);
        DocumentApprovalShareService rotated =
                new DocumentApprovalShareService(documents, "rotated-unit-test-key-not-for-production-12345");
        assertNotFound(() -> rotated.resolve(user, token));
    }

    @Test
    void rejectsAnotherTenantBeforeLookingUpTheDocument() throws Exception {
        String token = service.issue(user, 42L);
        user.setTenantId(5L);
        assertNotFound(() -> service.resolve(user, token));
        verify(documents, times(1)).listDocuments(any(), eq("ALL"), isNull(), eq(42L));
    }

    @Test
    void doesNotGrantAccessOnIssueOrAfterPermissionRevocation() throws Exception {
        String token = service.issue(user, 42L);
        when(documents.listDocuments(user, "ALL", null, 42L)).thenReturn(Collections.emptyList());
        assertNotFound(() -> service.resolve(user, token));
        assertNotFound(() -> service.issue(user, 42L));
    }

    @Test
    void rejectsUnauthenticatedRequestsWithoutLookingUpDocuments() {
        assertThatThrownBy(() -> service.issue(null, 42L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
        verifyNoInteractions(documents);
    }

    @Test
    void failsClosedWithoutASuitableServerSecret() {
        DocumentApprovalShareService unconfigured = new DocumentApprovalShareService(documents, "");
        assertThatThrownBy(() -> unconfigured.issue(user, 42L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    private void assertNotFound(org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
