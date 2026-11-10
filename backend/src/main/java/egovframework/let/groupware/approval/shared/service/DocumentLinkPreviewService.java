package egovframework.let.groupware.approval.shared.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.IDN;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.function.Predicate;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.conn.DnsResolver;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentLinkPreviewService {
    static final int MAX_BODY_BYTES = 1024 * 1024;
    private static final int MAX_URL_LENGTH = 2048;
    private static final int MAX_REDIRECTS = 3;
    private static final int MAX_TITLE_LENGTH = 200;
    private static final int MAX_DESCRIPTION_LENGTH = 500;
    private static final int MAX_SITE_NAME_LENGTH = 100;
    private static final int MAX_IMAGE_URL_LENGTH = 2048;

    private final HostResolver hostResolver;
    private final PageFetcher pageFetcher;
    private final Predicate<InetAddress> publicAddress;

    public DocumentLinkPreviewService() {
        this(InetAddress::getAllByName, new ApachePageFetcher(),
                DocumentLinkPreviewService::isPublicAddress);
    }

    DocumentLinkPreviewService(HostResolver hostResolver, PageFetcher pageFetcher,
            Predicate<InetAddress> publicAddress) {
        this.hostResolver = hostResolver;
        this.pageFetcher = pageFetcher;
        this.publicAddress = publicAddress;
    }

    public DocumentLinkPreviewVO preview(String rawUrl) {
        URI target = validateUrl(rawUrl);
        for (int redirects = 0; ; redirects++) {
            InetAddress[] addresses = resolvePublicAddresses(target);
            FetchResponse response;
            try {
                response = pageFetcher.fetch(target, addresses);
            } catch (IOException error) {
                throw remoteFailure();
            }

            if (isRedirect(response.statusCode)) {
                if (redirects >= MAX_REDIRECTS || response.location == null
                        || response.location.trim().isEmpty()) {
                    throw remoteFailure();
                }
                URI next = resolveRedirect(target, response.location);
                if ("https".equalsIgnoreCase(target.getScheme())
                        && "http".equalsIgnoreCase(next.getScheme())) {
                    throw badRequest();
                }
                target = next;
                continue;
            }
            if (response.statusCode != 200 || response.body.length > MAX_BODY_BYTES
                    || !isHtml(response.contentType)) {
                throw remoteFailure();
            }
            return parseMetadata(target, response.body);
        }
    }

    private DocumentLinkPreviewVO parseMetadata(URI pageUri, byte[] body) {
        try {
            Document document = Jsoup.parse(new ByteArrayInputStream(body), charsetFrom(body), pageUri.toString());
            String title = firstMeta(document, "meta[property=og:title]", MAX_TITLE_LENGTH);
            if (title.isEmpty()) title = cleanText(document.title(), MAX_TITLE_LENGTH);
            if (title.isEmpty()) title = cleanText(pageUri.getHost(), MAX_TITLE_LENGTH);

            String description = firstMeta(document, "meta[property=og:description]", MAX_DESCRIPTION_LENGTH);
            if (description.isEmpty()) description = firstMeta(document, "meta[name=description]", MAX_DESCRIPTION_LENGTH);

            String siteName = firstMeta(document, "meta[property=og:site_name]", MAX_SITE_NAME_LENGTH);
            if (siteName.isEmpty()) siteName = cleanText(pageUri.getHost(), MAX_SITE_NAME_LENGTH);

            DocumentLinkPreviewVO preview = new DocumentLinkPreviewVO();
            preview.setSiteName(cleanText(siteName, MAX_SITE_NAME_LENGTH));
            preview.setTitle(cleanText(title, MAX_TITLE_LENGTH));
            preview.setDescription(cleanText(description, MAX_DESCRIPTION_LENGTH));
            preview.setImageUrl(resolveImageUrl(pageUri,
                    firstMeta(document, "meta[property=og:image]", MAX_IMAGE_URL_LENGTH)));
            return preview;
        } catch (IOException error) {
            throw remoteFailure();
        }
    }

    private String resolveImageUrl(URI pageUri, String rawImageUrl) {
        if (rawImageUrl == null || rawImageUrl.isEmpty() || rawImageUrl.length() > MAX_IMAGE_URL_LENGTH) {
            return null;
        }
        try {
            URI resolved = validateUrl(pageUri.resolve(rawImageUrl).toString());
            resolvePublicAddresses(resolved);
            return resolved.toASCIIString();
        } catch (ResponseStatusException | IllegalArgumentException error) {
            return null;
        }
    }

    private URI resolveRedirect(URI current, String location) {
        if (location.length() > MAX_URL_LENGTH) throw remoteFailure();
        try {
            return validateUrl(current.resolve(new URI(location)).toString());
        } catch (URISyntaxException | IllegalArgumentException error) {
            throw remoteFailure();
        }
    }

    private URI validateUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.length() == 0 || rawUrl.length() > MAX_URL_LENGTH
                || !rawUrl.equals(rawUrl.trim())) {
            throw badRequest();
        }
        try {
            URI uri = new URI(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (!uri.isAbsolute() || scheme == null || host == null
                    || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))
                    || uri.getRawUserInfo() != null || uri.getRawFragment() != null
                    || host.length() > 253 || host.indexOf('%') >= 0) {
                throw badRequest();
            }
            int port = uri.getPort();
            int defaultPort = "https".equalsIgnoreCase(scheme) ? 443 : 80;
            if (port != -1 && port != defaultPort) throw badRequest();

            String hostValue = stripIpv6Brackets(host);
            if (hostValue.indexOf(':') >= 0
                    && InetAddress.getByName(hostValue) instanceof Inet4Address) {
                throw badRequest();
            }
            String asciiHost = hostValue.indexOf(':') >= 0 ? hostValue.toLowerCase(Locale.ROOT)
                    : IDN.toASCII(hostValue, IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
            if (asciiHost.isEmpty() || isLocalHostname(asciiHost)) throw badRequest();
            return uri.normalize();
        } catch (URISyntaxException | IllegalArgumentException | UnknownHostException error) {
            throw badRequest();
        }
    }

    private InetAddress[] resolvePublicAddresses(URI uri) {
        final InetAddress[] addresses;
        try {
            addresses = hostResolver.resolve(stripIpv6Brackets(uri.getHost()));
        } catch (UnknownHostException error) {
            throw remoteFailure();
        }
        if (addresses == null || addresses.length == 0) throw remoteFailure();
        for (InetAddress address : addresses) {
            if (!publicAddress.test(address)) throw badRequest();
        }
        return addresses.clone();
    }

    private static boolean isLocalHostname(String host) {
        return "localhost".equals(host) || host.endsWith(".localhost")
                || host.endsWith(".local") || host.endsWith(".internal");
    }

    private static String stripIpv6Brackets(String host) {
        return host.startsWith("[") && host.endsWith("]")
                ? host.substring(1, host.length() - 1) : host;
    }

    static boolean isPublicAddress(InetAddress address) {
        if (address == null || address.isAnyLocalAddress() || address.isLoopbackAddress()
                || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                || address.isMulticastAddress()) {
            return false;
        }
        byte[] bytes = address.getAddress();
        if (bytes.length == 4) {
            int first = unsigned(bytes[0]);
            int second = unsigned(bytes[1]);
            int third = unsigned(bytes[2]);
            return !(first == 0 || first == 10 || first == 127
                    || (first == 100 && second >= 64 && second <= 127)
                    || (first == 169 && second == 254)
                    || (first == 172 && second >= 16 && second <= 31)
                    || (first == 192 && second == 0 && (third == 0 || third == 2))
                    || (first == 192 && second == 168)
                    || first == 192 && second == 88 && third == 99
                    || first == 198 && (second == 18 || second == 19)
                    || first == 198 && second == 51 && third == 100
                    || first == 203 && second == 0 && third == 113
                    || first >= 224);
        }
        if (bytes.length != 16) return false;
        if (isIpv4Mapped(bytes)) return false;
        int first = unsigned(bytes[0]);
        int second = unsigned(bytes[1]);
        boolean globalUnicast = first >= 0x20 && first <= 0x3f;
        boolean ietfAssignment = first == 0x20 && second == 0x01 && unsigned(bytes[2]) <= 0x01;
        boolean documentationV6 = first == 0x20 && second == 0x01
                && unsigned(bytes[2]) == 0x0d && unsigned(bytes[3]) == 0xb8;
        boolean documentation = first == 0x3f && second == 0xff;
        boolean sixToFour = first == 0x20 && second == 0x02;
        return globalUnicast && !ietfAssignment && !documentationV6 && !documentation && !sixToFour;
    }

    private static boolean isIpv4Mapped(byte[] bytes) {
        for (int i = 0; i < 10; i++) if (bytes[i] != 0) return false;
        return (bytes[10] & 0xff) == 0xff && (bytes[11] & 0xff) == 0xff;
    }

    private static int unsigned(byte value) {
        return value & 0xff;
    }

    private static boolean isRedirect(int status) {
        return status == 301 || status == 302 || status == 303 || status == 307 || status == 308;
    }

    private static boolean isHtml(String contentType) {
        if (contentType == null) return false;
        String normalized = contentType.toLowerCase(Locale.ROOT).trim();
        return normalized.startsWith("text/html") || normalized.startsWith("application/xhtml+xml");
    }

    private static String firstMeta(Document document, String selector, int maxLength) {
        for (Element element : document.select(selector)) {
            String value = cleanText(element.attr("content"), maxLength);
            if (!value.isEmpty()) return value;
        }
        return "";
    }

    private static String cleanText(String value, int maxLength) {
        if (value == null) return "";
        String text = Jsoup.parseBodyFragment(value).text().replaceAll("\\s+", " ").trim();
        if (text.codePointCount(0, text.length()) <= maxLength) return text;
        return text.substring(0, text.offsetByCodePoints(0, maxLength));
    }

    private static String charsetFrom(byte[] body) {
        String prefix = new String(body, 0, Math.min(body.length, 4096), StandardCharsets.ISO_8859_1);
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(
                "(?i)<meta[^>]+charset\\s*=\\s*[\"']?([a-z0-9._-]+)").matcher(prefix);
        return matcher.find() ? matcher.group(1) : StandardCharsets.UTF_8.name();
    }

    private static ResponseStatusException badRequest() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "외부 링크를 미리볼 수 없습니다.");
    }

    private static ResponseStatusException remoteFailure() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "외부 링크 미리보기를 불러오지 못했습니다.");
    }

    static DnsResolver pinnedDnsResolver(String host, InetAddress[] resolvedAddresses) {
        String pinnedHost = stripIpv6Brackets(host);
        InetAddress[] pinnedAddresses = resolvedAddresses.clone();
        return requestedHost -> {
            if (pinnedHost.equalsIgnoreCase(stripIpv6Brackets(requestedHost))) {
                return pinnedAddresses.clone();
            }
            throw new UnknownHostException("Unvalidated host");
        };
    }

    interface HostResolver {
        InetAddress[] resolve(String host) throws UnknownHostException;
    }

    interface PageFetcher {
        FetchResponse fetch(URI uri, InetAddress[] resolvedAddresses) throws IOException;
    }

    static final class FetchResponse {
        final int statusCode;
        final String contentType;
        final String location;
        final byte[] body;

        FetchResponse(int statusCode, String contentType, String location, byte[] body) {
            this.statusCode = statusCode;
            this.contentType = contentType;
            this.location = location;
            this.body = body == null ? new byte[0] : body;
        }
    }

    private static final class ApachePageFetcher implements PageFetcher {
        @Override
        public FetchResponse fetch(URI uri, InetAddress[] resolvedAddresses) throws IOException {
            DnsResolver resolver = pinnedDnsResolver(uri.getHost(), resolvedAddresses);
            RequestConfig config = RequestConfig.custom()
                    .setConnectTimeout(3000)
                    .setSocketTimeout(3000)
                    .setConnectionRequestTimeout(3000)
                    .build();
            try (CloseableHttpClient client = HttpClients.custom()
                    .setDnsResolver(resolver)
                    .setDefaultRequestConfig(config)
                    .disableRedirectHandling()
                    .disableCookieManagement()
                    .disableContentCompression()
                    .build()) {
                HttpGet request = new HttpGet(uri);
                request.setHeader("Accept", "text/html,application/xhtml+xml");
                request.setHeader("Accept-Encoding", "identity");
                try (CloseableHttpResponse response = client.execute(request)) {
                    int status = response.getStatusLine().getStatusCode();
                    Header contentType = response.getFirstHeader("Content-Type");
                    Header location = response.getFirstHeader("Location");
                    String type = contentType == null ? null : contentType.getValue();
                    String redirect = location == null ? null : location.getValue();
                    if (isRedirect(status)) return new FetchResponse(status, type, redirect, null);

                    HttpEntity entity = response.getEntity();
                    if (entity == null) return new FetchResponse(status, type, redirect, null);
                    if (entity.getContentLength() > MAX_BODY_BYTES) throw new IOException("Response too large");
                    return new FetchResponse(status, type, redirect, readBounded(entity));
                }
            }
        }

        private byte[] readBounded(HttpEntity entity) throws IOException {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int total = 0;
            try (java.io.InputStream input = entity.getContent()) {
                int count;
                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    if (total > MAX_BODY_BYTES) throw new IOException("Response too large");
                    output.write(buffer, 0, count);
                }
            }
            return output.toByteArray();
        }
    }
}
