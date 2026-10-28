package egovframework.com.common.service.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import org.junit.jupiter.api.Test;

class RichTextDocumentSanitizerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RichTextDocumentSanitizer sanitizer = new RichTextDocumentSanitizer();

    @Test
    void sanitizesHtmlWhilePreservingEditorTextStylesAndTables() {
        String html = "<p onclick=\"run()\">본문<script>alert(1)</script>"
                + "<span style=\"font-family:Arial;font-size:14px;color:#123456;"
                + "background-image:url(https://bad.example/x)\">강조</span></p>"
                + "<table><tbody><tr><td colspan=\"2\" style=\"width:160px;"
                + "font-family:Arial;font-size:22pt;"
                + "background-color:#ffffff;behavior:expression(alert(1))\">셀</td></tr></tbody></table>"
                + "<a href=\"javascript:alert(1)\" onclick=\"run()\">위험 링크</a>";

        String sanitized = sanitizer.sanitizeHtml(html);

        assertThat(sanitized).contains("본문", "강조", "font-family:Arial", "font-size:14px", "color:#123456")
                .contains("<table", "colspan=\"2\"", "width:160px", "font-family:Arial",
                        "font-size:22pt", "background-color:#ffffff")
                .doesNotContain("<script", "onclick", "url(", "expression(", "javascript:");
    }

    @Test
    void doesNotInsertPrettyPrintWhitespaceAfterHardBreaksInTableCells() {
        String html = "<table><tbody><tr><td><p><strong>중요관리점모니터링 일지<br>[X-ray 금속검출공정]"
                + "</strong></p><p>* 기기 감도<br>   - 표준시편을 통과시킨다.<br>이어지는 문장</p></td></tr></tbody></table>";

        String sanitized = sanitizer.sanitizeHtml(html);

        assertThat(sanitized).contains("<br>[X-ray 금속검출공정]")
                .contains("<br>   - 표준시편을 통과시킨다.<br>이어지는 문장")
                .doesNotContain("<br>\n", "<br>\r");
    }

    @Test
    void sanitizesTiptapJsonWhilePreservingSupportedMarksAndImageSessionMetadata() throws Exception {
        JsonNode document = objectMapper.readTree("{\"type\":\"doc\",\"content\":["
                + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"강조\","
                + "\"marks\":[{\"type\":\"textStyle\",\"attrs\":{\"color\":\"#123456\","
                + "\"fontFamily\":\"Arial\",\"fontSize\":\"14px\",\"onclick\":\"run()\"}}]}]},"
                + "{\"type\":\"image\",\"attrs\":{\"src\":\"https://cdn.example/image.png\","
                + "\"data-upload-token\":null,\"data-object-key\":\"tenant/1/temp/image.png\","
                + "\"width\":800,\"height\":\"auto\",\"onclick\":\"run()\"}},"
                + "{\"type\":\"script\",\"text\":\"drop\"}]}");

        JsonNode sanitized = sanitizer.sanitizeJson(document);

        JsonNode markAttributes = sanitized.path("content").get(0).path("content").get(0)
                .path("marks").get(0).path("attrs");
        assertThat(markAttributes.path("color").asText()).isEqualTo("#123456");
        assertThat(markAttributes.path("fontFamily").asText()).isEqualTo("Arial");
        assertThat(markAttributes.path("fontSize").asText()).isEqualTo("14px");
        assertThat(markAttributes.has("onclick")).isFalse();

        JsonNode imageAttributes = sanitized.path("content").get(1).path("attrs");
        assertThat(imageAttributes.path("data-upload-token").isNull()).isTrue();
        assertThat(imageAttributes.path("data-object-key").asText()).isEqualTo("tenant/1/temp/image.png");
        assertThat(imageAttributes.path("width").asInt()).isEqualTo(800);
        assertThat(imageAttributes.has("height")).isFalse();
        assertThat(imageAttributes.has("onclick")).isFalse();
        assertThat(sanitized.path("content")).hasSize(2);
    }

    @Test
    void returnsAnEmptyDocumentForInvalidRootOrUnsafeImageSource() throws Exception {
        JsonNode invalidRoot = objectMapper.readTree("{\"type\":\"paragraph\",\"content\":[]}");
        JsonNode unsafeImage = objectMapper.readTree("{\"type\":\"doc\",\"content\":["
                + "{\"type\":\"image\",\"attrs\":{\"src\":\"javascript:alert(1)\","
                + "\"data-upload-token\":\"token-1\"}}]}");

        JsonNode empty = sanitizer.sanitizeJson(invalidRoot);
        JsonNode sanitizedImage = sanitizer.sanitizeJson(unsafeImage).path("content").get(0).path("attrs");

        assertThat(empty.path("type").asText()).isEqualTo("doc");
        assertThat(empty.path("content")).isEmpty();
        assertThat(sanitizedImage.has("src")).isFalse();
        assertThat(sanitizedImage.path("data-upload-token").asText()).isEqualTo("token-1");
    }

        @Test
        void preservesRelativeApplicationImageUrlsAndSafeExternalImageUrls() {
                String html = "<p><img src=\"/api/v1/co/workflow/forms/77/template-images/12\" alt=\"owned\">"
                                + "<img src=\"https://remote.example/image.png\" alt=\"remote\"></p>";

                String sanitized = sanitizer.sanitizeHtml(html);

                assertThat(sanitized).contains("/api/v1/co/workflow/forms/77/template-images/12")
                                .contains("https://remote.example/image.png");
        }

        @Test
        void removesMalformedLinkHrefsWithoutDroppingTheirTextNodes() throws Exception {
                JsonNode document = objectMapper.readTree("{\"type\":\"doc\",\"content\":["
                                + "{\"type\":\"text\",\"text\":\"array\",\"marks\":[{\"type\":\"link\","
                                + "\"attrs\":{\"href\":[\"https://safe.example\"]}}]},"
                                + "{\"type\":\"text\",\"text\":\"object\",\"marks\":[{\"type\":\"link\","
                                + "\"attrs\":{\"href\":{\"url\":\"https://safe.example\"}}}]},"
                                + "{\"type\":\"text\",\"text\":\"unsafe\",\"marks\":[{\"type\":\"link\","
                                + "\"attrs\":{\"href\":\"javascript:alert(1)\"}}]},"
                                + "{\"type\":\"text\",\"text\":\"safe\",\"marks\":[{\"type\":\"link\","
                                + "\"attrs\":{\"href\":\"https://safe.example/path\"}}]}]}");

                JsonNode content = sanitizer.sanitizeJson(document).path("content");

                assertThat(content).hasSize(4);
                assertThat(content.get(0).path("text").asText()).isEqualTo("array");
                assertThat(content.get(0).path("marks").get(0).path("attrs").path("href").isMissingNode()).isTrue();
                assertThat(content.get(1).path("marks").get(0).path("attrs").path("href").isMissingNode()).isTrue();
                assertThat(content.get(2).path("marks").get(0).path("attrs").path("href").isMissingNode()).isTrue();
                assertThat(content.get(3).path("marks").get(0).path("attrs").path("href").asText())
                                .isEqualTo("https://safe.example/path");
        }

            @Test
            void preservesSafeTableCellStylesAndRejectsUnsafeStyleDeclarationsInJson() throws Exception {
                JsonNode document = objectMapper.readTree("{\"type\":\"doc\",\"content\":[{\"type\":\"table\","
                        + "\"content\":[{\"type\":\"tableRow\",\"content\":[{\"type\":\"tableCell\","
                        + "\"attrs\":{\"colspan\":2,\"style\":\"width:160px;background-color:#fff;"
                        + "font-family:Arial;font-size:22pt;"
                        + "white-space:pre-wrap;word-break:break-all;overflow-wrap:anywhere;"
                        + "background-image:url(https://bad.example/x)\"},\"content\":[{\"type\":\"paragraph\"}]}]}]}]}");

                JsonNode attributes = sanitizer.sanitizeJson(document).path("content").get(0)
                        .path("content").get(0).path("content").get(0).path("attrs");

                assertThat(attributes.path("colspan").asInt()).isEqualTo(2);
                assertThat(attributes.path("style").asText())
                        .isEqualTo("width:160px;background-color:#fff;font-family:Arial;font-size:22pt;"
                                + "white-space:pre-wrap;"
                                + "word-break:break-all;overflow-wrap:anywhere");
            }
}