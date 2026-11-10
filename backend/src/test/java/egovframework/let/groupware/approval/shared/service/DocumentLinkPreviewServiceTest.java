package egovframework.let.groupware.approval.shared.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.ArrayDeque;
import java.util.Queue;

import org.apache.http.conn.DnsResolver;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class DocumentLinkPreviewServiceTest {
    private static final String PUBLIC_URL = "https://example.test/article";

    @Test
    void extractsBoundedOpenGraphMetadataAndResolvesTheImageAgainstThePage() throws Exception {
        String html = "<html><head><meta property='og:site_name' content='Example'>"
                + "<meta property='og:title' content='  OG &amp; title  '>"
                + "<meta property='og:description' content='Description'>"
                + "<meta property='og:image' content='/preview.png'></head>"
                + "<body><script>doNotReturn()</script></body></html>";
        DocumentLinkPreviewService service = service((uri, addresses) ->
                response(200, "text/html; charset=UTF-8", null, html), publicResolver());

        DocumentLinkPreviewVO preview = service.preview(PUBLIC_URL);

        assertThat(preview.getSiteName()).isEqualTo("Example");
        assertThat(preview.getTitle()).isEqualTo("OG & title");
        assertThat(preview.getDescription()).isEqualTo("Description");
        assertThat(preview.getImageUrl()).isEqualTo("https://example.test/preview.png");
        assertThat(preview.getTitle()).doesNotContain("<", "doNotReturn");
    }

    @Test
    void fallsBackToPageTitleAndHostWhenOpenGraphFieldsAreAbsent() throws Exception {
        DocumentLinkPreviewService service = service((uri, addresses) ->
                response(200, "text/html", null, "<title>Page title</title>"), publicResolver());

        DocumentLinkPreviewVO preview = service.preview(PUBLIC_URL);

        assertThat(preview.getTitle()).isEqualTo("Page title");
        assertThat(preview.getSiteName()).isEqualTo("example.test");
        assertThat(preview.getDescription()).isEmpty();
    }

    @Test
    void boundsMetadataAndRejectsMappedOrDocumentationAddresses() throws Exception {
        String longTitle = new String(new char[220]).replace('\0', 'x');
        DocumentLinkPreviewService service = service((uri, addresses) ->
                response(200, "text/html", null,
                        "<meta property='og:title' content='" + longTitle + "'>"), publicResolver());

        assertThat(service.preview(PUBLIC_URL).getTitle()).hasSize(200);
        assertThat(DocumentLinkPreviewService.isPublicAddress(InetAddress.getByName("2001:db8::1"))).isFalse();
        assertThat(DocumentLinkPreviewService.isPublicAddress(InetAddress.getByName("2001:4860:4860::8888"))).isTrue();

        assertThatThrownBy(() -> service.preview("http://[::ffff:8.8.8.8]/"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void omitsImagesThatResolveToPrivateAddresses() throws Exception {
        InetAddress publicAddress = InetAddress.getByAddress(new byte[] { 8, 8, 8, 8 });
        InetAddress privateAddress = InetAddress.getByAddress(new byte[] { 10, 0, 0, 2 });
        DocumentLinkPreviewService service = service((uri, addresses) ->
                response(200, "text/html", null,
                        "<meta property='og:image' content='https://private-image.test/image.png'>"),
                host -> host.equals("example.test")
                        ? new InetAddress[] { publicAddress } : new InetAddress[] { privateAddress });

        assertThat(service.preview(PUBLIC_URL).getImageUrl()).isNull();
    }

    @Test
    void rejectsUnsafeSchemesCredentialsPortsAndPrivateAddressesBeforeFetching() throws Exception {
        DocumentLinkPreviewService service = service((uri, resolved) -> {
            throw new AssertionError("Unsafe URL reached the fetcher");
        }, host -> new InetAddress[] { InetAddress.getByAddress(new byte[] { 127, 0, 0, 1 }) });

        for (String url : new String[] {
                "file:///etc/passwd",
                "javascript:alert(1)",
                "https://user:password@example.test/article",
                "https://example.test:8443/article",
                "http://localhost/article",
                "http://127.0.0.1/article",
                "http://192.168.1.10/article"
        }) {
            assertThatThrownBy(() -> service.preview(url)).isInstanceOf(ResponseStatusException.class);
        }
        assertThat(DocumentLinkPreviewService.isPublicAddress(InetAddress.getByAddress(
                new byte[] { (byte) 192, 0, 2, 1 }))).isFalse();
    }

    @Test
    void rejectsDnsAnswersIfAnyAddressIsNotGloballyRoutable() throws Exception {
        InetAddress publicAddress = InetAddress.getByAddress(new byte[] { 8, 8, 8, 8 });
        InetAddress privateAddress = InetAddress.getByAddress(new byte[] { 10, 0, 0, 1 });
        DocumentLinkPreviewService service = service((uri, addresses) -> {
            throw new AssertionError("Mixed public/private DNS answer reached the fetcher");
        }, host -> new InetAddress[] { publicAddress, privateAddress });

        assertThatThrownBy(() -> service.preview(PUBLIC_URL))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void pinsHttpClientDnsResolutionToTheValidatedHostAndAddresses() throws Exception {
        InetAddress address = InetAddress.getByAddress(new byte[] { 8, 8, 8, 8 });
        DnsResolver resolver = DocumentLinkPreviewService.pinnedDnsResolver(
                "example.test", new InetAddress[] { address });

        assertThat(resolver.resolve("EXAMPLE.TEST")).containsExactly(address);
        assertThatThrownBy(() -> resolver.resolve("other.test")).isInstanceOf(UnknownHostException.class);
    }

    @Test
    void revalidatesRedirectTargetsAndDoesNotFollowMoreThanThreeRedirects() throws Exception {
        int[] requests = { 0 };
        DocumentLinkPreviewService blockedRedirect = service((uri, addresses) -> {
            requests[0]++;
            return response(302, null, "http://127.0.0.1/private", "");
        }, publicResolver());

        assertThatThrownBy(() -> blockedRedirect.preview(PUBLIC_URL))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(requests[0]).isEqualTo(1);

        Queue<DocumentLinkPreviewService.FetchResponse> redirects = new ArrayDeque<>();
        for (int i = 0; i < 4; i++) redirects.add(response(302, null,
                "https://example.test/redirect-" + i, ""));
        DocumentLinkPreviewService tooManyRedirects = service((uri, addresses) -> redirects.remove(),
                publicResolver());
        assertThatThrownBy(() -> tooManyRedirects.preview(PUBLIC_URL))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsNonHtmlOversizedAndFailedResponses() throws Exception {
        DocumentLinkPreviewService nonHtml = service((uri, addresses) ->
                response(200, "image/png", null, "image"), publicResolver());
        DocumentLinkPreviewService oversized = service((uri, addresses) ->
                response(200, "text/html", null,
                        new String(new char[DocumentLinkPreviewService.MAX_BODY_BYTES + 1])), publicResolver());
        DocumentLinkPreviewService failed = service((uri, addresses) -> {
            throw new IOException("private network detail");
        }, publicResolver());

        for (DocumentLinkPreviewService service : new DocumentLinkPreviewService[] {
                nonHtml, oversized, failed
        }) {
            assertThatThrownBy(() -> service.preview(PUBLIC_URL))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageNotContaining("private network detail");
        }
    }

    private static DocumentLinkPreviewService service(DocumentLinkPreviewService.PageFetcher fetcher,
            DocumentLinkPreviewService.HostResolver resolver) {
        return new DocumentLinkPreviewService(resolver, fetcher,
                DocumentLinkPreviewService::isPublicAddress);
    }

    private static DocumentLinkPreviewService.HostResolver publicResolver() throws Exception {
        InetAddress address = InetAddress.getByAddress(new byte[] { 8, 8, 8, 8 });
        return host -> new InetAddress[] { address };
    }

    private static DocumentLinkPreviewService.FetchResponse response(
            int status, String contentType, String location, String body) {
        return new DocumentLinkPreviewService.FetchResponse(status, contentType, location,
                body.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
