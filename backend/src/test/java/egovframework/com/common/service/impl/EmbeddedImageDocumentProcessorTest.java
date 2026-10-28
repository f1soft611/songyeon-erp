package egovframework.com.common.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import org.junit.jupiter.api.Test;

class EmbeddedImageDocumentProcessorTest {

    private static final Long TENANT_ID = 7L;
    private static final Long OWNER_ID = 42L;
    private static final String OWNER_TYPE = "NOTICE";
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void promotesReferencedSessionImageAndRewritesHtmlAndJson() throws Exception {
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        String token = "new-token";
        CommonFileVO promoted = ownedFile(901L, token, "detail.png");
        when(storage.listOwnedImages(TENANT_ID, OWNER_TYPE, OWNER_ID)).thenReturn(Collections.emptyList());
        when(storage.promoteTemporaryImage(TENANT_ID, OWNER_TYPE, OWNER_ID, token, "detail.png", "operator"))
            .thenReturn(promoted);
        EmbeddedImageDocumentProcessor processor = processor(storage);

        EmbeddedImageDocumentProcessor.Result result = processor.process(
                TENANT_ID,
                OWNER_TYPE,
                OWNER_ID,
                "<p><img src=\"https://preview.example/new.png\" alt=\"new.png\" "
                        + "data-upload-token=\"" + token + "\"></p>",
                jsonImage(token, null, null, "https://preview.example/new.png"),
                Collections.singletonList(sessionUpload(token, "detail.png")),
                Collections.singletonList(sessionUpload(token, "new.png")),
                "operator",
                urlResolver());

        assertThat(result.getHtml()).contains(imageUrl(promoted.getFileId()))
                .contains("data-file-id=\"901\"").doesNotContain("data-upload-token", "preview.example");
        assertThat(result.getJson()).contains(imageUrl(promoted.getFileId()))
                .contains("data-file-id").doesNotContain("data-upload-token", "preview.example");
        assertThat(result.getRetainedFileIds()).containsExactly(901L);
        verify(storage).promoteTemporaryImage(TENANT_ID, OWNER_TYPE, OWNER_ID, token, "detail.png", "operator");
    }

    @Test
    void preservesOwnedImageWhenJsonTokenIsNullAndSessionIsEmpty() throws Exception {
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        CommonFileVO owned = ownedFile(902L, "legacy-token", "legacy.png");
        when(storage.listOwnedImages(TENANT_ID, OWNER_TYPE, OWNER_ID)).thenReturn(Collections.singletonList(owned));
        EmbeddedImageDocumentProcessor processor = processor(storage);

        EmbeddedImageDocumentProcessor.Result result = processor.process(
                TENANT_ID,
                OWNER_TYPE,
                OWNER_ID,
                "<p><img src=\"blob:local-preview\" data-file-id=\"902\" "
                        + "data-object-key=\"" + owned.getObjectKey() + "\" alt=\"legacy.png\"></p>",
                jsonImage(null, "902", owned.getObjectKey(), "blob:local-preview"),
                Collections.<EmbeddedImageUploadVO>emptyList(),
                Collections.<EmbeddedImageUploadVO>emptyList(),
                "operator",
                urlResolver());

        assertThat(result.getHtml()).contains(imageUrl(902L)).doesNotContain("data-upload-token", "blob:");
        assertThat(result.getJson()).contains(imageUrl(902L)).doesNotContain("data-upload-token", "blob:");
        assertThat(result.getRetainedFileIds()).containsExactly(902L);
        verify(storage, never()).promoteTemporaryImage(
                TENANT_ID, OWNER_TYPE, OWNER_ID, "null", "legacy.png", "operator");
    }

    @Test
    void rejectsReferencedTokenOutsideCurrentTemporarySession() throws Exception {
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(storage.listOwnedImages(TENANT_ID, OWNER_TYPE, OWNER_ID)).thenReturn(Collections.emptyList());
        EmbeddedImageDocumentProcessor processor = processor(storage);

        assertThatThrownBy(() -> processor.process(
                TENANT_ID,
                OWNER_TYPE,
                OWNER_ID,
                "<img src=\"https://preview.example/new.png\" data-upload-token=\"missing-token\">",
                jsonImage("missing-token", null, null, "https://preview.example/new.png"),
                Collections.singletonList(sessionUpload("missing-token", "image.png")),
                Collections.<EmbeddedImageUploadVO>emptyList(),
                "operator",
                urlResolver()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("임시 업로드 세션");
    }

    @Test
    void rejectsAnImageOwnedByAnotherDomainWhenResolverIdentifiesItAsStable() throws Exception {
        EmbeddedImageStorageService storage = mock(EmbeddedImageStorageService.class);
        when(storage.listOwnedImages(TENANT_ID, OWNER_TYPE, OWNER_ID)).thenReturn(Collections.emptyList());
        EmbeddedImageDocumentProcessor processor = processor(storage);
        EmbeddedImageDocumentProcessor.StableImageUrlResolver resolver =
                new EmbeddedImageDocumentProcessor.StableImageUrlResolver() {
                    @Override
                    public String toStableUrl(CommonFileVO image) {
                        return imageUrl(image.getFileId());
                    }

                    @Override
                    public CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages) {
                        if (source.startsWith("/api/v1/co/workflow/forms/")) {
                            throw new IllegalArgumentException("다른 도메인의 본문 이미지는 사용할 수 없습니다.");
                        }
                        return null;
                    }
                };

        assertThatThrownBy(() -> processor.process(
                TENANT_ID,
                OWNER_TYPE,
                OWNER_ID,
                "<img src=\"/api/v1/co/workflow/forms/77/template-images/4\">",
                jsonImage(null, null, null, "/api/v1/co/workflow/forms/77/template-images/4"),
                Collections.<EmbeddedImageUploadVO>emptyList(),
                Collections.<EmbeddedImageUploadVO>emptyList(),
                "operator",
                resolver))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("다른 도메인");
    }

    private EmbeddedImageDocumentProcessor processor(EmbeddedImageStorageService storage) {
        return new EmbeddedImageDocumentProcessor(storage, new RichTextDocumentSanitizer());
    }

    private EmbeddedImageDocumentProcessor.StableImageUrlResolver urlResolver() {
        return new EmbeddedImageDocumentProcessor.StableImageUrlResolver() {
            @Override
            public String toStableUrl(CommonFileVO image) {
                return imageUrl(image.getFileId());
            }

            @Override
            public CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages) {
                return null;
            }
        };
    }

    private JsonNode jsonImage(String token, String fileId, String objectKey, String source) throws Exception {
        String tokenNode = token == null ? "null" : "\"" + token + "\"";
        String fileIdNode = fileId == null ? "null" : "\"" + fileId + "\"";
        String objectKeyNode = objectKey == null ? "null" : "\"" + objectKey + "\"";
        String json = "{\"type\":\"doc\",\"content\":[{\"type\":\"image\",\"attrs\":{"
                + "\"src\":\"" + source + "\",\"data-upload-token\":" + tokenNode
                + ",\"data-file-id\":" + fileIdNode + ",\"data-object-key\":" + objectKeyNode
                + ",\"alt\":\"image.png\"}}]}";
        return objectMapper.readTree(json);
    }

    private EmbeddedImageUploadVO sessionUpload(String token, String fileName) {
        EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
        upload.setUploadToken(token);
        upload.setFileName(fileName);
        return upload;
    }

    private CommonFileVO ownedFile(Long fileId, String token, String fileName) {
        CommonFileVO file = new CommonFileVO();
        file.setFileId(fileId);
        file.setTenantId(TENANT_ID);
        file.setOwnerType(OWNER_TYPE);
        file.setOwnerId(OWNER_ID);
        file.setFileUsageType("EMBEDDED");
        file.setDeletedYn("N");
        file.setObjectKey("tenant/7/embedded-images/notice/42/" + token + "/" + fileName);
        file.setFileName(fileName);
        file.setBucketName("document-attachments");
        return file;
    }

    private String imageUrl(Long fileId) {
        return "/api/v1/groupware/boards/notice/posts/42/embedded-images?fileId=" + fileId;
    }
}