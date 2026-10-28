package egovframework.com.common.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service("richTextDocumentSanitizer")
public class RichTextDocumentSanitizer {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Safelist HTML_ALLOWLIST = createHtmlAllowlist();
    private static final Set<String> NODE_TYPES = setOf(
            "doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem",
            "blockquote", "codeBlock", "hardBreak", "horizontalRule", "table", "tableRow",
            "tableCell", "tableHeader", "image");
    private static final Set<String> MARK_TYPES = setOf(
            "bold", "italic", "strike", "underline", "code", "link", "textStyle");
    private static final Set<String> TEXT_STYLE_ATTRIBUTES = setOf("color", "fontFamily", "fontSize");
    private static final Set<String> TABLE_STYLE_ATTRIBUTES = setOf(
            "background", "background-color", "border", "border-bottom", "border-left",
            "border-right", "border-top", "color", "font-family", "font-size", "font-style",
            "font-weight", "height", "line-height", "min-width", "overflow-wrap", "text-align",
            "vertical-align", "width", "white-space", "word-break");
    private static final Set<String> INLINE_TEXT_STYLE_ATTRIBUTES = setOf(
            "color", "font-family", "font-size", "font-style", "font-weight", "line-height",
            "overflow-wrap", "text-decoration", "white-space", "word-break");
        private static final Set<String> WHITE_SPACE_VALUES = setOf(
            "normal", "pre", "nowrap", "pre-wrap", "pre-line", "break-spaces");
        private static final Set<String> WORD_BREAK_VALUES = setOf(
            "normal", "break-all", "keep-all", "break-word");
        private static final Set<String> OVERFLOW_WRAP_VALUES = setOf(
            "normal", "break-word", "anywhere");
    private static final Pattern IMAGE_DIMENSION = Pattern.compile(
            "^(?:[0-9]{1,4})(?:\\.[0-9]{1,2})?(?:px|%)?$", Pattern.CASE_INSENSITIVE);

    public String sanitizeHtml(String html) {
        if (!StringUtils.hasText(html)) {
            return "";
        }
        Document.OutputSettings outputSettings = new Document.OutputSettings().prettyPrint(false);
        Document parsed = Jsoup.parseBodyFragment(html);
        parsed.outputSettings(outputSettings);
        parsed.select("script, style, svg, iframe, object, embed, link, meta").remove();
        String safeHtml = Jsoup.clean(parsed.body().html(), "", HTML_ALLOWLIST, outputSettings);
        Document safeDocument = Jsoup.parseBodyFragment(safeHtml);
        safeDocument.outputSettings(outputSettings);
        for (Element element : safeDocument.body().getAllElements()) {
            sanitizeElementAttributes(element);
        }
        return safeDocument.body().html().trim();
    }

    public JsonNode sanitizeJson(JsonNode document) {
        if (!(document instanceof ObjectNode) || !"doc".equals(textValue(document.get("type")))) {
            return emptyDocument();
        }
        JsonNode sanitized = sanitizeNode(document, true);
        return sanitized == null ? emptyDocument() : sanitized;
    }

    private JsonNode sanitizeNode(JsonNode node, boolean root) {
        if (!(node instanceof ObjectNode)) {
            return null;
        }
        String type = textValue(node.get("type"));
        if (!NODE_TYPES.contains(type) || (root && !"doc".equals(type))) {
            return null;
        }

        ObjectNode sanitized = OBJECT_MAPPER.createObjectNode();
        sanitized.put("type", type);
        if ("text".equals(type)) {
            JsonNode text = node.get("text");
            if (text == null || !text.isTextual()) {
                return null;
            }
            sanitized.set("text", text.deepCopy());
        }

        JsonNode rawAttributes = node.get("attrs");
        if (rawAttributes instanceof ObjectNode) {
            ObjectNode attributes = sanitizeJsonAttributes(type, (ObjectNode) rawAttributes);
            if (!attributes.isEmpty()) {
                sanitized.set("attrs", attributes);
            }
        }

        JsonNode rawMarks = node.get("marks");
        if (rawMarks instanceof ArrayNode) {
            ArrayNode marks = OBJECT_MAPPER.createArrayNode();
            for (JsonNode mark : rawMarks) {
                JsonNode safeMark = sanitizeMark(mark);
                if (safeMark != null) {
                    marks.add(safeMark);
                }
            }
            if (!marks.isEmpty()) {
                sanitized.set("marks", marks);
            }
        }

        JsonNode rawContent = node.get("content");
        if (rawContent instanceof ArrayNode) {
            ArrayNode content = OBJECT_MAPPER.createArrayNode();
            for (JsonNode child : rawContent) {
                JsonNode safeChild = sanitizeNode(child, false);
                if (safeChild != null) {
                    content.add(safeChild);
                }
            }
            sanitized.set("content", content);
        }
        return sanitized;
    }

    private JsonNode sanitizeMark(JsonNode mark) {
        if (!(mark instanceof ObjectNode)) {
            return null;
        }
        String type = textValue(mark.get("type"));
        if (!MARK_TYPES.contains(type)) {
            return null;
        }
        ObjectNode sanitized = OBJECT_MAPPER.createObjectNode();
        sanitized.put("type", type);
        JsonNode rawAttributes = mark.get("attrs");
        if (!(rawAttributes instanceof ObjectNode)) {
            return sanitized;
        }

        ObjectNode attributes = OBJECT_MAPPER.createObjectNode();
        Iterator<Map.Entry<String, JsonNode>> fields = rawAttributes.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String name = field.getKey();
            JsonNode value = field.getValue();
            if ("textStyle".equals(type) && TEXT_STYLE_ATTRIBUTES.contains(name)
                    && value.isTextual() && isSafeStyleValue(value.asText())) {
                attributes.set(name, value.deepCopy());
            } else if ("link".equals(type) && "href".equals(name)
                    && value.isTextual() && isSafeUrl(value.asText(), true)) {
                attributes.set(name, value.deepCopy());
            } else if ("link".equals(type) && "title".equals(name) && value.isTextual()) {
                attributes.set(name, value.deepCopy());
            } else if ("link".equals(type) && "target".equals(name)
                    && value.isTextual() && "_blank".equals(value.asText())) {
                attributes.put(name, value.asText());
            } else if ("link".equals(type) && "rel".equals(name)
                    && value.isTextual() && !containsUnsafeMarkup(value.asText())) {
                attributes.put(name, value.asText());
            }
        }
        sanitized.set("attrs", attributes);
        return sanitized;
    }

    private ObjectNode sanitizeJsonAttributes(String type, ObjectNode rawAttributes) {
        ObjectNode attributes = OBJECT_MAPPER.createObjectNode();
        Iterator<Map.Entry<String, JsonNode>> fields = rawAttributes.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            String name = field.getKey();
            JsonNode value = field.getValue();
            if ("heading".equals(type) && "level".equals(name)
                    && value.canConvertToInt() && value.asInt() >= 1 && value.asInt() <= 6) {
                attributes.set(name, value.deepCopy());
            } else if ("orderedList".equals(type) && "start".equals(name)
                    && value.canConvertToInt() && value.asInt() > 0) {
                attributes.set(name, value.deepCopy());
            } else if ("tableCell".equals(type) || "tableHeader".equals(type)) {
                sanitizeTableAttribute(attributes, name, value);
            } else if ("image".equals(type)) {
                sanitizeImageAttribute(attributes, name, value);
            }
        }
        if ("tableCell".equals(type) || "tableHeader".equals(type)) {
            JsonNode style = rawAttributes.get("style");
            if (style != null && style.isTextual()) {
                String safeStyle = sanitizeStyle(style.asText(), TABLE_STYLE_ATTRIBUTES);
                if (StringUtils.hasText(safeStyle)) {
                    attributes.put("style", safeStyle);
                }
            }
        }
        return attributes;
    }

    private void sanitizeTableAttribute(ObjectNode attributes, String name, JsonNode value) {
        if (("colspan".equals(name) || "rowspan".equals(name))
                && value.canConvertToInt() && value.asInt() > 0 && value.asInt() <= 100) {
            attributes.set(name, value.deepCopy());
        } else if ("colwidth".equals(name) && value.isArray()) {
            ArrayNode widths = OBJECT_MAPPER.createArrayNode();
            for (JsonNode width : value) {
                if (width.canConvertToInt() && width.asInt() > 0 && width.asInt() <= 2000) {
                    widths.add(width.asInt());
                }
            }
            if (!widths.isEmpty()) {
                attributes.set(name, widths);
            }
        }
    }

    private void sanitizeImageAttribute(ObjectNode attributes, String name, JsonNode value) {
        if (("data-upload-token".equals(name) || "data-upload-state".equals(name)) && value.isNull()) {
            attributes.set(name, OBJECT_MAPPER.nullNode());
        } else if ("data-upload-token".equals(name) && value.isTextual()) {
            String token = value.asText();
            if (StringUtils.hasText(token) && !containsUnsafeMarkup(token)) {
                attributes.put(name, token);
            }
        } else if (("data-upload-state".equals(name) || "data-file-id".equals(name)
                || "data-object-key".equals(name) || "data-mime-type".equals(name)
                || "alt".equals(name) || "title".equals(name)) && value.isTextual()
                && !containsUnsafeMarkup(value.asText())) {
            attributes.put(name, value.asText());
        } else if ("data-file-size".equals(name) && value.canConvertToLong()
                && value.asLong() >= 0 && value.asLong() <= 10485760) {
            attributes.put(name, value.asLong());
        } else if ("src".equals(name) && value.isTextual() && isSafeUrl(value.asText(), false)) {
            attributes.put(name, value.asText());
        } else if (("width".equals(name) || "height".equals(name)) && isSafeImageDimension(value)) {
            attributes.set(name, value.deepCopy());
        }
    }

    private boolean isSafeImageDimension(JsonNode value) {
        if (value.canConvertToInt()) {
            int dimension = value.asInt();
            return dimension > 0 && dimension <= 1200;
        }
        return value.isTextual() && isSafeImageDimension(value.asText());
    }

    private boolean isSafeImageDimension(String value) {
        if (!StringUtils.hasText(value) || !IMAGE_DIMENSION.matcher(value.trim()).matches()) {
            return false;
        }
        String numericValue = value.trim().replaceAll("(?i)(px|%)$", "");
        try {
            double dimension = Double.parseDouble(numericValue);
            return dimension > 0 && dimension <= 1200;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private void sanitizeElementAttributes(Element element) {
        String tag = element.tagName().toLowerCase(Locale.ROOT);
        for (org.jsoup.nodes.Attribute attribute : element.attributes().asList()) {
            String name = attribute.getKey().toLowerCase(Locale.ROOT);
            String value = attribute.getValue();
            if (name.startsWith("on")) {
                element.removeAttr(name);
            } else if (("href".equals(name) || "src".equals(name))
                    && !isSafeUrl(value, "a".equals(tag))) {
                element.removeAttr(name);
            } else if ("style".equals(name)) {
                Set<String> allowedStyles = "span".equals(tag)
                        ? INLINE_TEXT_STYLE_ATTRIBUTES
                        : TABLE_STYLE_ATTRIBUTES;
                if (!("span".equals(tag) || "td".equals(tag) || "th".equals(tag)
                        || "col".equals(tag) || "colgroup".equals(tag))) {
                    element.removeAttr(name);
                    continue;
                }
                String safeStyle = sanitizeStyle(value, allowedStyles);
                if (StringUtils.hasText(safeStyle)) {
                    element.attr(name, safeStyle);
                } else {
                    element.removeAttr(name);
                }
            } else if (("width".equals(name) || "height".equals(name)) && "img".equals(tag)
                    && !isSafeImageDimension(value)) {
                element.removeAttr(name);
            }
        }
    }

    private String sanitizeStyle(String style, Set<String> allowedProperties) {
        if (!StringUtils.hasText(style)) {
            return "";
        }
        StringBuilder safeStyle = new StringBuilder();
        for (String declaration : style.split(";")) {
            int separator = declaration.indexOf(':');
            if (separator <= 0) {
                continue;
            }
            String property = declaration.substring(0, separator).trim().toLowerCase(Locale.ROOT);
            String value = declaration.substring(separator + 1).trim();
            if (!allowedProperties.contains(property) || !isSafeStyleDeclaration(property, value)) {
                continue;
            }
            if (safeStyle.length() > 0) {
                safeStyle.append(';');
            }
            safeStyle.append(property).append(':').append(value);
        }
        return safeStyle.toString();
    }

    private boolean isSafeStyleValue(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        return StringUtils.hasText(value) && value.length() <= 200
                && !containsUnsafeMarkup(value)
                && !normalized.contains("url(")
                && !normalized.contains("expression(")
                && !normalized.contains("javascript:")
                && !normalized.contains("vbscript:");
    }

    private boolean isSafeStyleDeclaration(String property, String value) {
        if (!isSafeStyleValue(value)) {
            return false;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if ("white-space".equals(property)) {
            return WHITE_SPACE_VALUES.contains(normalized);
        }
        if ("word-break".equals(property)) {
            return WORD_BREAK_VALUES.contains(normalized);
        }
        if ("overflow-wrap".equals(property)) {
            return OVERFLOW_WRAP_VALUES.contains(normalized);
        }
        return true;
    }

    private boolean isSafeUrl(String value, boolean allowMailto) {
        if (!StringUtils.hasText(value) || value.startsWith("//") || value.indexOf('\\') >= 0) {
            return false;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("/") || normalized.startsWith("#")) {
            return true;
        }
        return normalized.startsWith("http://") || normalized.startsWith("https://")
                || (allowMailto && normalized.startsWith("mailto:"));
    }

    private boolean containsUnsafeMarkup(String value) {
        return value.indexOf('<') >= 0 || value.indexOf('>') >= 0
                || value.indexOf('{') >= 0 || value.indexOf('}') >= 0;
    }

    private JsonNode emptyDocument() {
        ObjectNode empty = OBJECT_MAPPER.createObjectNode();
        empty.put("type", "doc");
        empty.putArray("content");
        return empty;
    }

    private String textValue(JsonNode value) {
        return value == null || value.isNull() || !value.isTextual() ? "" : value.asText();
    }

    private static Safelist createHtmlAllowlist() {
        return new Safelist().preserveRelativeLinks(true)
                .addTags("a", "blockquote", "br", "code", "col", "colgroup", "em", "h1", "h2",
                        "h3", "h4", "h5", "h6", "li", "ol", "img", "p", "pre", "span",
                        "strong", "table", "tbody", "td", "th", "thead", "tr", "ul", "s", "u")
                .addAttributes("a", "href", "title", "target", "rel")
                .addAttributes("img", "alt", "data-upload-token", "data-upload-state", "data-file-id",
                        "data-object-key", "data-file-size", "data-mime-type", "height", "src", "title", "width")
                .addAttributes("td", "colspan", "rowspan", "colwidth", "style")
                .addAttributes("th", "colspan", "rowspan", "colwidth", "style")
                .addAttributes("col", "style")
                .addAttributes("colgroup", "style")
                .addAttributes("span", "style");
    }

    private static Set<String> setOf(String... values) {
        return Collections.unmodifiableSet(new HashSet<String>(Arrays.asList(values)));
    }
}