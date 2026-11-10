package egovframework.let.groupware.shared.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ShareTokenCodecTest {
    private final ShareTokenCodec codec =
            new ShareTokenCodec("unit-test-share-key-not-for-production-12345");

    @Test
    void roundTripsTenantAndContentIdWithFreshTokens() {
        String first = codec.issue(ShareTokenCodec.ContentType.DOCUMENT, 4L, 42L);
        String second = codec.issue(ShareTokenCodec.ContentType.DOCUMENT, 4L, 42L);

        assertThat(first).matches("v1\\.[A-Za-z0-9_-]{59}").isNotEqualTo(second);
        ShareTokenCodec.ShareReference reference =
                codec.resolve(ShareTokenCodec.ContentType.DOCUMENT, first);
        assertThat(reference.getTenantId()).isEqualTo(4L);
        assertThat(reference.getContentId()).isEqualTo(42L);
    }

    @Test
    void rejectsTokensWhenResolvedWithAnotherContentDomain() {
        String token = codec.issue(ShareTokenCodec.ContentType.DOCUMENT, 4L, 42L);

        assertNotFound(() -> codec.resolve(ShareTokenCodec.ContentType.NOTICE, token));
    }

    @Test
    void rejectsMalformedTokensAndInvalidPayloads() {
        for (String token : new String[] { null, "", "42",
                "v2." + new String(new char[59]).replace('\0', 'A'),
                "v1." + new String(new char[58]).replace('\0', 'A'),
                "v1." + new String(new char[60]).replace('\0', 'A') }) {
            assertNotFound(() -> codec.resolve(ShareTokenCodec.ContentType.NOTICE, token));
        }
        assertThatThrownBy(() -> codec.issue(ShareTokenCodec.ContentType.NOTICE, 0L, 42L))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> codec.issue(ShareTokenCodec.ContentType.NOTICE, 4L, 0L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void failsClosedWhenTheSecretIsNotConfigured() {
        ShareTokenCodec unconfigured = new ShareTokenCodec("");

        assertThatThrownBy(() -> unconfigured.issue(ShareTokenCodec.ContentType.NOTICE, 4L, 42L))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    private void assertNotFound(org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
