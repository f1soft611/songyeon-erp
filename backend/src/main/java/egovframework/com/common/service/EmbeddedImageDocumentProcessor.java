package egovframework.com.common.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.util.StringUtils;

public class EmbeddedImageDocumentProcessor {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final EmbeddedImageDocumentStorage imageStorageService;
    private final RichTextDocumentSanitizer documentSanitizer;

    public EmbeddedImageDocumentProcessor(
            EmbeddedImageDocumentStorage imageStorageService,
            RichTextDocumentSanitizer documentSanitizer) {
        this.imageStorageService = imageStorageService;
        this.documentSanitizer = documentSanitizer;
    }

    public Result process(
            Long tenantId,
            String ownerType,
            Long ownerId,
            String html,
            JsonNode json,
            List<EmbeddedImageUploadVO> referencedImageMetadata,
            List<EmbeddedImageUploadVO> temporaryUploads,
            String uploadedBy,
            StableImageUrlResolver urlResolver) throws Exception {
        validateOwnerContext(tenantId, ownerType, ownerId, urlResolver);

        String sanitizedHtml = documentSanitizer.sanitizeHtml(html);
        JsonNode sanitizedJson = documentSanitizer.sanitizeJson(json);
        List<CommonFileVO> listedImages = imageStorageService.listOwnedImages(tenantId, ownerType, ownerId);
        List<CommonFileVO> ownedImages = listedImages == null
                ? new ArrayList<CommonFileVO>() : new ArrayList<CommonFileVO>(listedImages);
        Map<String, EmbeddedImageUploadVO> uploadsByToken = indexTemporaryUploads(referencedImageMetadata);
        Map<String, EmbeddedImageUploadVO> sessionByToken = indexTemporaryUploads(temporaryUploads);
        for (Map.Entry<String, EmbeddedImageUploadVO> session : sessionByToken.entrySet()) {
            if (!uploadsByToken.containsKey(session.getKey())) {
                uploadsByToken.put(session.getKey(), session.getValue());
            }
        }

        Set<String> referencedTokens = new HashSet<String>();
        Document htmlDocument = Jsoup.parseBodyFragment(sanitizedHtml);
        for (Element image : htmlDocument.body().select("img[data-upload-token]")) {
            addTextToken(image.attr("data-upload-token"), referencedTokens);
        }
        collectJsonUploadTokens(sanitizedJson, referencedTokens);

        Map<String, CommonFileVO> resolvedImagesByToken = new HashMap<String, CommonFileVO>();
        for (String token : referencedTokens) {
            CommonFileVO alreadyOwned = findOwnedImageByUploadToken(token, tenantId, ownerType, ownerId, ownedImages);
            if (alreadyOwned != null) {
                resolvedImagesByToken.put(token, alreadyOwned);
                continue;
            }
            if (!sessionByToken.containsKey(token)) {
                throw new IllegalArgumentException("본문 이미지가 현재 임시 업로드 세션에 속하지 않습니다.");
            }
            EmbeddedImageUploadVO upload = uploadsByToken.get(token);
            if (upload == null) {
                throw new IllegalArgumentException("본문 이미지 임시 업로드 정보가 없습니다.");
            }
            CommonFileVO promoted = imageStorageService.promoteTemporaryImage(
                    tenantId, ownerType, ownerId, token, upload.getFileName(), uploadedBy);
            validatePromotedImage(promoted, tenantId, ownerType, ownerId);
            resolvedImagesByToken.put(token, promoted);
            ownedImages.add(promoted);
        }

        Set<Long> retainedFileIds = new HashSet<Long>();
        rewriteHtmlImages(htmlDocument.body(), tenantId, ownerType, ownerId,
                resolvedImagesByToken, ownedImages, retainedFileIds, urlResolver);
        JsonNode rewrittenJson = sanitizedJson.deepCopy();
        rewriteJsonImages(rewrittenJson, tenantId, ownerType, ownerId,
                resolvedImagesByToken, ownedImages, retainedFileIds, urlResolver);

        return new Result(htmlDocument.body().html(), OBJECT_MAPPER.writeValueAsString(rewrittenJson), retainedFileIds);
    }

    private void validateOwnerContext(
            Long tenantId, String ownerType, Long ownerId, StableImageUrlResolver urlResolver) {
        if (tenantId == null || tenantId <= 0 || !StringUtils.hasText(ownerType)
                || ownerId == null || ownerId <= 0 || urlResolver == null) {
            throw new IllegalArgumentException("본문 이미지 소유 정보가 올바르지 않습니다.");
        }
    }

    private Map<String, EmbeddedImageUploadVO> indexTemporaryUploads(List<EmbeddedImageUploadVO> uploads) {
        Map<String, EmbeddedImageUploadVO> indexed = new HashMap<String, EmbeddedImageUploadVO>();
        if (uploads == null) {
            return indexed;
        }
        for (EmbeddedImageUploadVO upload : uploads) {
            if (upload == null || !StringUtils.hasText(upload.getUploadToken())
                    || !StringUtils.hasText(upload.getFileName())
                    || indexed.put(upload.getUploadToken(), upload) != null) {
                throw new IllegalArgumentException("본문 이미지 임시 업로드 정보가 올바르지 않습니다.");
            }
        }
        return indexed;
    }

    private void collectJsonUploadTokens(JsonNode node, Set<String> tokens) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            if ("image".equals(readJsonText(node, "type"))) {
                addTextToken(readJsonText(node.path("attrs"), "data-upload-token"), tokens);
            }
            node.elements().forEachRemaining(child -> collectJsonUploadTokens(child, tokens));
        } else if (node.isArray()) {
            node.elements().forEachRemaining(child -> collectJsonUploadTokens(child, tokens));
        }
    }

    private void addTextToken(String token, Set<String> tokens) {
        if (StringUtils.hasText(token)) {
            tokens.add(token);
        }
    }

    private String readJsonText(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNull() || value.isMissingNode() || !value.isTextual() ? "" : value.asText();
    }

    private void rewriteHtmlImages(
            Element root,
            Long tenantId,
            String ownerType,
            Long ownerId,
            Map<String, CommonFileVO> resolvedImagesByToken,
            List<CommonFileVO> ownedImages,
            Set<Long> retainedFileIds,
            StableImageUrlResolver urlResolver) {
        for (Element image : root.select("img")) {
            CommonFileVO owned = resolveImage(
                    image.attr("data-upload-token"), image.attr("data-file-id"),
                    image.attr("data-object-key"), image.attr("src"), tenantId, ownerType, ownerId,
                    resolvedImagesByToken, ownedImages, urlResolver);
            if (owned == null) {
                continue;
            }
            setStableImageAttributes(image, owned, urlResolver);
            retainedFileIds.add(owned.getFileId());
        }
    }

    private void rewriteJsonImages(
            JsonNode node,
            Long tenantId,
            String ownerType,
            Long ownerId,
            Map<String, CommonFileVO> resolvedImagesByToken,
            List<CommonFileVO> ownedImages,
            Set<Long> retainedFileIds,
            StableImageUrlResolver urlResolver) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            if ("image".equals(readJsonText(object, "type"))) {
                JsonNode rawAttributes = object.get("attrs");
                ObjectNode attributes = rawAttributes instanceof ObjectNode
                        ? (ObjectNode) rawAttributes : object.putObject("attrs");
                CommonFileVO owned = resolveImage(
                        readJsonText(attributes, "data-upload-token"),
                        readJsonText(attributes, "data-file-id"),
                        readJsonText(attributes, "data-object-key"),
                        readJsonText(attributes, "src"),
                        tenantId, ownerType, ownerId, resolvedImagesByToken, ownedImages, urlResolver);
                if (owned != null) {
                    setStableImageAttributes(attributes, owned, urlResolver);
                    retainedFileIds.add(owned.getFileId());
                }
            }
            object.elements().forEachRemaining(child -> rewriteJsonImages(
                    child, tenantId, ownerType, ownerId, resolvedImagesByToken,
                    ownedImages, retainedFileIds, urlResolver));
        } else if (node.isArray()) {
            node.elements().forEachRemaining(child -> rewriteJsonImages(
                    child, tenantId, ownerType, ownerId, resolvedImagesByToken,
                    ownedImages, retainedFileIds, urlResolver));
        }
    }

    private CommonFileVO resolveImage(
            String uploadToken,
            String fileId,
            String objectKey,
            String source,
            Long tenantId,
            String ownerType,
            Long ownerId,
            Map<String, CommonFileVO> resolvedImagesByToken,
            List<CommonFileVO> ownedImages,
            StableImageUrlResolver urlResolver) {
        CommonFileVO byToken = StringUtils.hasText(uploadToken) ? resolvedImagesByToken.get(uploadToken) : null;
        CommonFileVO byMetadata = findOwnedImage(objectKey, fileId, tenantId, ownerType, ownerId, ownedImages);
        if (byToken != null && byMetadata != null && !byToken.getFileId().equals(byMetadata.getFileId())) {
            throw new IllegalArgumentException("본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        CommonFileVO owned = byToken != null ? byToken : byMetadata;
        if (owned == null && StringUtils.hasText(source)) {
            owned = urlResolver.resolveOwnedImage(source, ownedImages);
            if (owned != null) {
                validateOwnedImage(owned, tenantId, ownerType, ownerId);
            }
        }
        boolean hasOwnerMetadata = StringUtils.hasText(uploadToken)
                || StringUtils.hasText(fileId) || StringUtils.hasText(objectKey);
        if (owned == null && hasOwnerMetadata) {
            throw new IllegalArgumentException("현재 소유하지 않은 본문 이미지입니다.");
        }
        return owned;
    }

    private CommonFileVO findOwnedImageByUploadToken(
            String uploadToken,
            Long tenantId,
            String ownerType,
            Long ownerId,
            List<CommonFileVO> ownedImages) {
        if (!StringUtils.hasText(uploadToken) || ownedImages == null) {
            return null;
        }
        for (CommonFileVO image : ownedImages) {
            if (image == null || !StringUtils.hasText(image.getObjectKey())) {
                continue;
            }
            String[] segments = image.getObjectKey().split("/");
            if (segments.length >= 2 && uploadToken.equals(segments[segments.length - 2])) {
                validateOwnedImage(image, tenantId, ownerType, ownerId);
                return image;
            }
        }
        return null;
    }

    private CommonFileVO findOwnedImage(
            String objectKey,
            String fileId,
            Long tenantId,
            String ownerType,
            Long ownerId,
            List<CommonFileVO> ownedImages) {
        CommonFileVO byObjectKey = null;
        CommonFileVO byFileId = null;
        if (ownedImages != null) {
            for (CommonFileVO image : ownedImages) {
                if (image == null) continue;
                if (StringUtils.hasText(objectKey) && objectKey.equals(image.getObjectKey())) {
                    byObjectKey = image;
                }
                if (StringUtils.hasText(fileId) && image.getFileId() != null
                        && String.valueOf(image.getFileId()).equals(fileId)) {
                    byFileId = image;
                }
            }
        }
        if (byObjectKey != null && byFileId != null && !byObjectKey.getFileId().equals(byFileId.getFileId())) {
            throw new IllegalArgumentException("본문 이미지 소유 정보가 올바르지 않습니다.");
        }
        CommonFileVO owned = byObjectKey != null ? byObjectKey : byFileId;
        if (owned != null) {
            validateOwnedImage(owned, tenantId, ownerType, ownerId);
        }
        return owned;
    }

    private void validatePromotedImage(CommonFileVO image, Long tenantId, String ownerType, Long ownerId) {
        if (image == null || image.getFileId() == null || !"EMBEDDED".equalsIgnoreCase(image.getFileUsageType())) {
            throw new IllegalStateException("본문 이미지 소유 정보를 확정하지 못했습니다.");
        }
        validateOwnedImage(image, tenantId, ownerType, ownerId);
    }

    private void validateOwnedImage(CommonFileVO image, Long tenantId, String ownerType, Long ownerId) {
        if (image.getTenantId() == null || !tenantId.equals(image.getTenantId())
                || !ownerType.equalsIgnoreCase(image.getOwnerType())
                || image.getOwnerId() == null || !ownerId.equals(image.getOwnerId())
                || !"EMBEDDED".equalsIgnoreCase(image.getFileUsageType())
                || "Y".equalsIgnoreCase(image.getDeletedYn())) {
            throw new IllegalArgumentException("현재 소유하지 않은 본문 이미지입니다.");
        }
    }

    private void setStableImageAttributes(Element image, CommonFileVO owned, StableImageUrlResolver urlResolver) {
        String stableUrl = requireStableUrl(urlResolver.toStableUrl(owned));
        image.attr("src", stableUrl);
        image.attr("data-file-id", String.valueOf(owned.getFileId()));
        image.attr("data-object-key", owned.getObjectKey());
        removeTransientImageAttributes(image);
    }

    private void setStableImageAttributes(ObjectNode attributes, CommonFileVO owned,
            StableImageUrlResolver urlResolver) {
        attributes.put("src", requireStableUrl(urlResolver.toStableUrl(owned)));
        attributes.put("data-file-id", String.valueOf(owned.getFileId()));
        attributes.put("data-object-key", owned.getObjectKey());
        attributes.remove("data-upload-token");
        attributes.remove("data-upload-state");
        attributes.remove("data-file-size");
        attributes.remove("data-mime-type");
    }

    private void removeTransientImageAttributes(Element image) {
        image.removeAttr("data-upload-token");
        image.removeAttr("data-upload-state");
        image.removeAttr("data-file-size");
        image.removeAttr("data-mime-type");
        image.removeAttr("data-editor-upload-id");
    }

    private String requireStableUrl(String stableUrl) {
        if (!StringUtils.hasText(stableUrl)) {
            throw new IllegalStateException("본문 이미지 stable URL을 만들지 못했습니다.");
        }
        return stableUrl;
    }

    public interface StableImageUrlResolver {
        String toStableUrl(CommonFileVO image);

        CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages);
    }

    public static class Result {
        private final String html;
        private final String json;
        private final Set<Long> retainedFileIds;

        private Result(String html, String json, Set<Long> retainedFileIds) {
            this.html = html;
            this.json = json;
            this.retainedFileIds = Collections.unmodifiableSet(new HashSet<Long>(retainedFileIds));
        }

        public String getHtml() { return html; }
        public String getJson() { return json; }
        public Set<Long> getRetainedFileIds() { return retainedFileIds; }
    }
}