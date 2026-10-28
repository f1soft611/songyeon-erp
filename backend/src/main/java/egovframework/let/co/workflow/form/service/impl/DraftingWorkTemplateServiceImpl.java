package egovframework.let.co.workflow.form.service.impl;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateEmbeddedImageVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkTemplateVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service("draftingWorkTemplateService")
public class DraftingWorkTemplateServiceImpl {

    private static final String OWNER_TYPE = "DRAFTING_WORK_TEMPLATE";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final DraftingWorkDAO draftingWorkDAO;
    private final DraftingWorkTemplateImageService imageService;
    private final RichTextDocumentSanitizer documentSanitizer;
    private final EmbeddedImageDocumentProcessor imageDocumentProcessor;

    public DraftingWorkTemplateServiceImpl(
            DraftingWorkDAO draftingWorkDAO,
            DraftingWorkTemplateImageService imageService) {
        this.draftingWorkDAO = draftingWorkDAO;
        this.imageService = imageService;
        this.documentSanitizer = new RichTextDocumentSanitizer();
        this.imageDocumentProcessor = new EmbeddedImageDocumentProcessor(imageService, documentSanitizer);
    }

    public DraftingWorkTemplateVO getTemplate(Long tenantId, Long draftingWorkCategoryId) throws Exception {
        Map<String, Object> row = draftingWorkDAO.selectTemplate(tenantId, draftingWorkCategoryId);
        if (row == null) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        return toTemplate(row);
    }

    @Transactional(rollbackFor = Exception.class)
    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        return saveTemplate(tenantId, draftingWorkCategoryId, null, payload);
    }

    @Transactional(rollbackFor = Exception.class)
    public DraftingWorkTemplateVO saveTemplate(
            Long tenantId,
            Long draftingWorkCategoryId,
            String uploadedBy,
            DraftingWorkTemplateSaveRequestVO payload) throws Exception {
        if (payload == null || payload.getTemplateJson() == null
                || !payload.getTemplateJson().isObject()
                || !"doc".equals(payload.getTemplateJson().path("type").asText())
                || payload.getTemplateHtml() == null) {
            throw new IllegalArgumentException("템플릿 JSON과 HTML이 올바르게 입력되어야 합니다.");
        }

        draftingWorkDAO.lockTemplate(tenantId, draftingWorkCategoryId);
        EmbeddedImageDocumentProcessor.Result document = imageDocumentProcessor.process(
                tenantId,
                OWNER_TYPE,
                draftingWorkCategoryId,
                payload.getTemplateHtml(),
                payload.getTemplateJson(),
                toStorageUploads(payload.getEmbeddedImages()),
                toStorageUploads(payload.getEmbeddedImages()),
                uploadedBy,
                templateImageUrlResolver(draftingWorkCategoryId));

        Map<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("workId", draftingWorkCategoryId);
        params.put("templateJson", document.getJson());
        params.put("templateHtml", document.getHtml());
        if (draftingWorkDAO.updateTemplate(params) == 0) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }

        Map<String, Object> saved = draftingWorkDAO.selectTemplate(tenantId, draftingWorkCategoryId);
        if (saved == null) {
            throw new NoSuchElementException("기안양식을 찾을 수 없습니다.");
        }
        imageService.completeTemplateSave(
                tenantId, draftingWorkCategoryId, payload.getEmbeddedImages(), document.getRetainedFileIds());
        return toTemplate(saved);
    }

    private List<EmbeddedImageUploadVO> toStorageUploads(
            List<DraftingWorkTemplateEmbeddedImageVO> images) {
        List<EmbeddedImageUploadVO> uploads = new ArrayList<EmbeddedImageUploadVO>();
        if (images != null) {
            for (DraftingWorkTemplateEmbeddedImageVO image : images) {
                if (image == null) {
                    uploads.add(null);
                    continue;
                }
                EmbeddedImageUploadVO upload = new EmbeddedImageUploadVO();
                upload.setUploadToken(image.getUploadToken());
                upload.setFileName(image.getFileName());
                uploads.add(upload);
            }
        }
        return uploads;
    }

    private EmbeddedImageDocumentProcessor.StableImageUrlResolver templateImageUrlResolver(
            final Long draftingWorkCategoryId) {
        return new EmbeddedImageDocumentProcessor.StableImageUrlResolver() {
            @Override
            public String toStableUrl(CommonFileVO image) {
                return imageUrl(draftingWorkCategoryId, image.getFileId());
            }

            @Override
            public CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages) {
                String path = sourcePath(source);
                String base = "/api/v1/co/workflow/forms/";
                if (path == null || !path.startsWith(base)) {
                    if (isInternalApiUrl(path)) {
                        throw new IllegalArgumentException("다른 도메인의 본문 이미지는 사용할 수 없습니다.");
                    }
                    return null;
                }
                String route = path.substring(base.length());
                String formPrefix = draftingWorkCategoryId + "/template-images/";
                if (!route.startsWith(formPrefix)) {
                    throw new IllegalArgumentException("다른 기안양식의 본문 이미지는 사용할 수 없습니다.");
                }
                String fileIdText = route.substring(formPrefix.length());
                if (!fileIdText.matches("[0-9]+")) {
                    throw new IllegalArgumentException("본문 이미지 경로가 올바르지 않습니다.");
                }
                Long fileId = Long.valueOf(fileIdText);
                if (ownedImages != null) {
                    for (CommonFileVO image : ownedImages) {
                        if (image != null && fileId.equals(image.getFileId())) {
                            return image;
                        }
                    }
                }
                throw new IllegalArgumentException("현재 기안양식에 속한 본문 이미지가 아닙니다.");
            }
        };
    }

    private DraftingWorkTemplateVO toTemplate(Map<String, Object> row) throws Exception {
        DraftingWorkTemplateVO template = new DraftingWorkTemplateVO();
        template.setDraftingWorkCategoryId(asLong(row.get("draftingWorkCategoryId")));
        template.setCataTypeCode(asString(row.get("cataTypeCode")));
        template.setCodeName(asString(row.get("codeName")));
        Long formId = template.getDraftingWorkCategoryId();
        template.setTemplateHtml(sanitizeTemplateHtml(asString(row.get("templateHtml")), formId));
        Object jsonValue = row.get("templateJson");
        JsonNode json = jsonValue == null || !StringUtils.hasText(jsonValue.toString())
                ? emptyDocument() : OBJECT_MAPPER.readTree(jsonValue.toString());
        template.setTemplateJson(sanitizeTemplateJson(json, formId));
        Object hasDocument = row.get("hasDocument");
        template.setHasDocument(hasDocument == null
                ? template.getTemplateJson() != null || StringUtils.hasText(template.getTemplateHtml())
                : Boolean.valueOf(hasDocument.toString()));
        return template;
    }

    private JsonNode sanitizeTemplateJson(JsonNode json, Long formId) {
        JsonNode sanitized = documentSanitizer.sanitizeJson(json);
        removeForeignTemplateImageSources(sanitized, formId);
        return sanitized;
    }

    private void removeForeignTemplateImageSources(JsonNode node, Long formId) {
        if (node == null) return;
        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            if ("image".equals(object.path("type").asText())) {
                JsonNode attrs = object.get("attrs");
                if (attrs instanceof ObjectNode) {
                    String source = ((ObjectNode) attrs).path("src").asText();
                    if (isInternalApiUrl(source) && !isSafeTemplateImageUrl(source, formId)) {
                        ((ObjectNode) attrs).remove("src");
                    }
                }
            }
            object.elements().forEachRemaining(child -> removeForeignTemplateImageSources(child, formId));
        } else if (node.isArray()) {
            node.elements().forEachRemaining(child -> removeForeignTemplateImageSources(child, formId));
        }
    }

    private String sanitizeTemplateHtml(String html, Long formId) {
        Document document = Jsoup.parseBodyFragment(documentSanitizer.sanitizeHtml(html));
        for (Element image : document.body().select("img")) {
            String source = image.attr("src");
            if (isInternalApiUrl(source) && !isSafeTemplateImageUrl(source, formId)) {
                image.remove();
            }
        }
        return document.body().html();
    }

    private boolean isSafeTemplateImageUrl(String value, Long formId) {
        String path = sourcePath(value);
        if (path == null || formId == null) return false;
        String prefix = "/api/v1/co/workflow/forms/" + formId + "/template-images/";
        return path.startsWith(prefix) && path.substring(prefix.length()).matches("[0-9]+");
    }

    private boolean isInternalApiUrl(String value) {
        String path = sourcePath(value);
        return path != null && path.startsWith("/api/v1/");
    }

    private String sourcePath(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return URI.create(value).getPath();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private JsonNode emptyDocument() {
        ObjectNode empty = OBJECT_MAPPER.createObjectNode();
        empty.put("type", "doc");
        empty.putArray("content");
        return empty;
    }

    private String imageUrl(Long formId, Long fileId) {
        return "/api/v1/co/workflow/forms/" + formId + "/template-images/" + fileId;
    }

    private Long asLong(Object value) {
        return value == null ? null : Long.valueOf(value.toString());
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }
}