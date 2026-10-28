package egovframework.let.groupware.community.notice.service.impl;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import javax.annotation.Resource;

import egovframework.com.common.domain.model.CommonCommentVO;
import egovframework.com.common.domain.model.CommonCommentPageVO;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.domain.model.EmbeddedImageUploadVO;
import egovframework.com.common.service.CommonCommentService;
import egovframework.com.common.service.CommonFileService;
import egovframework.com.common.service.EmbeddedImageDocumentProcessor;
import egovframework.com.common.service.EmbeddedImageStorageService;
import egovframework.com.common.service.RichTextDocumentSanitizer;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSearchVO;
import egovframework.let.groupware.community.notice.domain.repository.NoticeBoardDAO;
import egovframework.let.groupware.community.notice.service.NoticeBoardService;
import egovframework.let.groupware.community.common.CommunityCategoryValidator;
import egovframework.let.common.dto.ListResult;
import egovframework.let.common.pagination.EgovPaginationSupport;

@Service("noticeBoardService")
public class NoticeBoardServiceImpl extends EgovAbstractServiceImpl implements NoticeBoardService {

    private static final String BOARD_TYPE_NOTICE = "NOTICE";
    private static final ObjectMapper IMAGE_OBJECT_MAPPER = new ObjectMapper();

    private final NoticeBoardDAO noticeBoardDAO;
    private final CommonFileService commonFileService;
    private final CommonCommentService commonCommentService;
    private final EmbeddedImageStorageService imageStorageService;
    private final EmbeddedImageDocumentProcessor imageDocumentProcessor;
    private final CommunityCategoryValidator categoryValidator;

    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    @Autowired
    public NoticeBoardServiceImpl(NoticeBoardDAO noticeBoardDAO, CommonFileService commonFileService,
            CommonCommentService commonCommentService, EmbeddedImageStorageService imageStorageService,
            CommunityCategoryValidator categoryValidator) {
        this.noticeBoardDAO = noticeBoardDAO;
        this.commonFileService = commonFileService;
        this.commonCommentService = commonCommentService;
        this.imageStorageService = imageStorageService;
        this.categoryValidator = categoryValidator;
        this.imageDocumentProcessor = imageStorageService == null ? null
                : new EmbeddedImageDocumentProcessor(imageStorageService, new RichTextDocumentSanitizer());
    }

    public NoticeBoardServiceImpl(NoticeBoardDAO noticeBoardDAO, CommonFileService commonFileService,
            CommonCommentService commonCommentService, EmbeddedImageStorageService imageStorageService) {
        this(noticeBoardDAO, commonFileService, commonCommentService, imageStorageService, null);
    }

    public NoticeBoardServiceImpl(NoticeBoardDAO noticeBoardDAO, CommonFileService commonFileService,
            CommonCommentService commonCommentService) {
        this(noticeBoardDAO, commonFileService, commonCommentService, null);
    }

    @Override
    public ListResult<NoticeBoardPostVO> listPosts(NoticeBoardPostSearchVO search) throws Exception {
        if (search == null) {
            search = new NoticeBoardPostSearchVO();
        }

        EgovPaginationSupport.apply(search, propertyService);

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", search.getTenantId());
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("keyword", StringUtils.hasText(search.getKeyword()) ? search.getKeyword().trim() : null);
        params.put("noticeGubunCode", StringUtils.hasText(search.getNoticeGubunCode())
            ? search.getNoticeGubunCode().trim() : null);
        params.put("isPinned", StringUtils.hasText(search.getIsPinned())
            ? search.getIsPinned().trim().toUpperCase() : null);
        params.put("firstIndex", search.getFirstIndex());
        params.put("lastIndex", search.getLastIndex());
        params.put("recordCountPerPage", search.getRecordCountPerPage());

        List<NoticeBoardPostVO> posts = noticeBoardDAO.selectNoticePostList(params);
        Long totalCount = noticeBoardDAO.selectNoticePostCount(params);
        if (posts == null) {
            posts = new ArrayList<>();
        }
        List<Long> postIds = new ArrayList<>();
        for (NoticeBoardPostVO post : posts) {
            if (post != null && post.getPostId() != null) {
                postIds.add(post.getPostId());
            }
        }
        if (postIds.isEmpty()) {
            return new ListResult<>(posts, totalCount == null ? 0L : totalCount);
        }
        Map<Long, List<CommonFileVO>> filesByPostId = commonFileService.listFilesByOwnerIds(
                search.getTenantId(), BOARD_TYPE_NOTICE, postIds);
        Map<Long, CommonCommentPageVO> commentPagesByPostId = commonCommentService.listCommentPagesByOwnerIds(
                search.getTenantId(), BOARD_TYPE_NOTICE, postIds, 3);
        Set<Long> commentIds = new LinkedHashSet<>();
        for (CommonCommentPageVO commentPage : commentPagesByPostId.values()) {
            if (commentPage == null || commentPage.getComments() == null) {
                continue;
            }
            for (CommonCommentVO comment : commentPage.getComments()) {
                if (comment != null && comment.getCommentId() != null
                        && !"Y".equalsIgnoreCase(comment.getDeletedYn())) {
                    commentIds.add(comment.getCommentId());
                }
            }
        }
        Map<Long, List<CommonFileVO>> commentFilesById = commentIds.isEmpty()
            ? Collections.emptyMap()
            : commonFileService.listFilesByOwnerIds(
                search.getTenantId(), "NOTICE_COMMENT", new ArrayList<>(commentIds));
        for (NoticeBoardPostVO post : posts) {
            if (post == null) {
                continue;
            }
            CommonCommentPageVO commentPage = commentPagesByPostId.get(post.getPostId());
            hydratePost(
                    search.getTenantId(),
                    post,
                    post.getPostId(),
                    filesByPostId.getOrDefault(post.getPostId(), Collections.emptyList()),
                    commentPage == null ? Collections.emptyList() : commentPage.getComments(),
                    commentPage == null ? 0L : commentPage.getResultCnt(),
                    commentPage != null && commentPage.isHasPrevious(),
                    commentPage == null ? null : commentPage.getNextBeforeCommentId(),
                    commentFilesById);
        }
        return new ListResult<>(posts, totalCount == null ? 0L : totalCount);
    }

    @Override
    public List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size) throws Exception {
        return listPosts(tenantId, keyword, page, size, null);
    }

    @Override
    public List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size, String noticeGubunCode) throws Exception {
        return listPosts(tenantId, keyword, page, size, noticeGubunCode, null);
    }

    @Override
    public List<NoticeBoardPostVO> listPosts(Long tenantId, String keyword, int page, int size,
            String noticeGubunCode, String isPinned) throws Exception {
        NoticeBoardPostSearchVO search = new NoticeBoardPostSearchVO();
        search.setTenantId(tenantId);
        search.setKeyword(keyword);
        search.setPageIndex(page);
        search.setPageUnit(size);
        search.setNoticeGubunCode(noticeGubunCode);
        search.setIsPinned(isPinned);
        return listPosts(search).getResultList();
    }

    @Override
    public NoticeBoardPostVO getPost(Long tenantId, Long postId) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        NoticeBoardPostVO post = noticeBoardDAO.selectNoticePostById(params);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }

        hydratePost(tenantId, post, postId);
        return post;
    }

    @Override
    @Transactional
    public NoticeBoardPostVO getPost(Long tenantId, Long postId, String loginCode) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        NoticeBoardPostVO post = noticeBoardDAO.selectNoticePostById(params);
        if (post == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }

        HashMap<String, Object> loginParams = new HashMap<>();
        loginParams.put("tenantId", tenantId);
        loginParams.put("loginCode", loginCode);
        Long loginId = noticeBoardDAO.selectLoginIdByLoginCode(loginParams);
        if (loginId == null) {
            throw new IllegalStateException("인증된 로그인 계정을 찾을 수 없습니다.");
        }

        HashMap<String, Object> viewParams = new HashMap<>();
        viewParams.put("tenantId", tenantId);
        viewParams.put("postId", postId);
        viewParams.put("boardTypeCode", BOARD_TYPE_NOTICE);
        viewParams.put("loginId", loginId);
        Long viewHistoryId = noticeBoardDAO.insertNoticePostViewHistory(viewParams);
        if (viewHistoryId != null) {
            noticeBoardDAO.incrementNoticePostViewCount(params);
            post = noticeBoardDAO.selectNoticePostById(params);
        }

        hydratePost(tenantId, post, postId);
        return post;
    }

    private void hydratePost(Long tenantId, NoticeBoardPostVO post, Long postId) throws Exception {
        CommonCommentPageVO commentPage = commonCommentService.listComments(tenantId, BOARD_TYPE_NOTICE, postId, 3, null);
        List<CommonCommentVO> comments =
            commentPage == null ? Collections.emptyList() : commentPage.getComments();
        hydratePost(tenantId, post, postId,
            commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId),
            comments,
            commentPage == null ? 0L : commentPage.getResultCnt(),
            commentPage != null && commentPage.isHasPrevious(),
            commentPage == null ? null : commentPage.getNextBeforeCommentId(),
            listCommentFiles(tenantId, comments));
    }

    private void hydratePost(Long tenantId, NoticeBoardPostVO post, Long postId,
            List<CommonFileVO> commonFiles, List<CommonCommentVO> comments, long commentCount,
            boolean hasPreviousComments, Long nextBeforeCommentId,
            Map<Long, List<CommonFileVO>> commentFilesById) throws Exception {
        List<NoticeBoardFileVO> files = new ArrayList<>();
        List<NoticeBoardFileVO> embeddedFiles = new ArrayList<>();
        List<CommonFileVO> embeddedCommonFiles = new ArrayList<CommonFileVO>();
        if (commonFiles != null) {
            for (CommonFileVO commonFile : commonFiles) {
                NoticeBoardFileVO noticeFile = toNoticeBoardFile(commonFile);
                if ("EMBEDDED".equalsIgnoreCase(commonFile.getFileUsageType())) {
                    embeddedFiles.add(noticeFile);
                    embeddedCommonFiles.add(commonFile);
                } else {
                    files.add(noticeFile);
                }
            }
        }
        if (!embeddedFiles.isEmpty()) {
            String stableContentsHtml = rewriteEmbeddedImageSources(
                post.getEffectiveContentsHtml(), postId, embeddedCommonFiles);
            post.setContentsHtml(stableContentsHtml);
            post.setContents(stableContentsHtml);
            post.setContentsJson(rewriteEmbeddedImageJsonSources(
                    post.getContentsJson(), postId, embeddedCommonFiles));
        }
        post.setAttachments(files);
        post.setAttachmentCount(files.size());

        List<CommonCommentVO> hydratedComments = comments == null ? new ArrayList<>() : comments;
        for (CommonCommentVO comment : hydratedComments) {
            if (comment == null) {
                continue;
            }
            if (comment.getCommentId() == null || "Y".equalsIgnoreCase(comment.getDeletedYn())) {
                comment.setAttachments(new ArrayList<>());
                continue;
            }
            List<CommonFileVO> commentFiles = commentFilesById.getOrDefault(comment.getCommentId(), Collections.emptyList());
            comment.setAttachments(commentFiles == null ? new ArrayList<>() : commentFiles);
        }
        post.setComments(hydratedComments);
        post.setHasPreviousComments(hasPreviousComments);
        post.setNextBeforeCommentId(nextBeforeCommentId);
        post.setCommentCount(Math.toIntExact(commentCount));
    }

    private Map<Long, List<CommonFileVO>> listCommentFiles(Long tenantId, List<CommonCommentVO> comments) throws Exception {
        Set<Long> commentIds = new LinkedHashSet<>();
        if (comments != null) {
            for (CommonCommentVO comment : comments) {
                if (comment != null && comment.getCommentId() != null
                        && !"Y".equalsIgnoreCase(comment.getDeletedYn())) {
                    commentIds.add(comment.getCommentId());
                }
            }
        }
        if (commentIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return commonFileService.listFilesByOwnerIds(tenantId, "NOTICE_COMMENT", new ArrayList<>(commentIds));
    }

    @Override
    @Transactional
    public NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload) throws Exception {
        return createPost(tenantId, payload, null, null);
        }

        @Override
        @Transactional
        public NoticeBoardPostVO createPost(Long tenantId, NoticeBoardPostSaveRequestVO payload,
            String actorId, String actorName) throws Exception {
        validateCreatePayload(payload);
        validateCategory(tenantId, payload.getNoticeGubunCode());
        requireImageStorageIfNeeded(payload);
        String contentsHtml = payload.getEffectiveContentsHtml();
        String contentsText = payload.getEffectiveContentsText();
        String contentsJson = payload.getEffectiveContentsJson();

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("title", payload.getTitle().trim());
        params.put("contents", contentsHtml);
        params.put("contentsHtml", contentsHtml);
        params.put("contentsJson", contentsJson);
        params.put("contentsText", contentsText);
        params.put("writerId", actorId);
        params.put("writerName", actorName);
        params.put("noticeGubunCode", payload.getNoticeGubunCode() == null ? null : payload.getNoticeGubunCode().trim());
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
        params.put("isPinned", StringUtils.hasText(payload.getIsPinned()) ? payload.getIsPinned().toUpperCase() : "N");
        putPopupSettings(params, payload);

        Long postId = noticeBoardDAO.insertNoticePost(params);
        if (payload.getAttachmentIds() != null && !payload.getAttachmentIds().isEmpty()) {
            for (Long fileId : payload.getAttachmentIds()) {
                HashMap<String, Object> attachParams = new HashMap<>();
                attachParams.put("tenantId", tenantId);
                attachParams.put("postId", postId);
                attachParams.put("boardFileId", fileId);
                noticeBoardDAO.selectNoticeAttachmentById(attachParams);
            }
        }
        if (imageStorageService != null) {
            EmbeddedImageDocumentProcessor.Result imageSave = rewriteAndPromoteEmbeddedImages(
                    tenantId, postId, contentsHtml, contentsJson, payload.getEmbeddedImages(),
                    payload.getTemporaryImages(), actorId);
            params.put("postId", postId);
            params.put("contents", imageSave.getHtml());
            params.put("contentsHtml", imageSave.getHtml());
            params.put("contentsJson", imageSave.getJson());
            params.put("contentsText", plainText(imageSave.getHtml()));
            noticeBoardDAO.updateNoticePost(params);
            imageStorageService.completeOwnerSave(tenantId, BOARD_TYPE_NOTICE, postId,
                    toStorageUploads(payload), imageSave.getRetainedFileIds());
        }

        return getPost(tenantId, postId);
    }

    @Override
    @Transactional
    public NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload) throws Exception {
        return updatePost(tenantId, postId, payload, null, null);
        }

        @Override
        @Transactional
        public NoticeBoardPostVO updatePost(Long tenantId, Long postId, NoticeBoardPostSaveRequestVO payload,
            String actorId, String actorName) throws Exception {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수정 요청이 비어 있습니다.");
        }
        validateCategory(tenantId, payload.getNoticeGubunCode());
        requireImageStorageIfNeeded(payload);

        HashMap<String, Object> existingParams = new HashMap<>();
        existingParams.put("tenantId", tenantId);
        existingParams.put("postId", postId);
        existingParams.put("boardTypeCode", BOARD_TYPE_NOTICE);
        if (noticeBoardDAO.selectNoticePostById(existingParams) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }
        String contentsHtml = payload.getEffectiveContentsHtml();
        String contentsText = payload.getEffectiveContentsText();
        String contentsJson = payload.getEffectiveContentsJson();

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("title", payload.getTitle() == null ? null : payload.getTitle().trim());
        params.put("contents", contentsHtml);
        params.put("contentsHtml", contentsHtml);
        params.put("contentsJson", contentsJson);
        params.put("contentsText", contentsText);
        params.put("writerName", payload.getWriterName());
        params.put("noticeGubunCode", payload.getNoticeGubunCode() == null ? null : payload.getNoticeGubunCode().trim());
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
        params.put("isPinned", StringUtils.hasText(payload.getIsPinned()) ? payload.getIsPinned().toUpperCase() : "N");
        putPopupSettings(params, payload);
        if (imageStorageService != null) {
            EmbeddedImageDocumentProcessor.Result imageSave = rewriteAndPromoteEmbeddedImages(
                    tenantId, postId, contentsHtml, contentsJson, payload.getEmbeddedImages(),
                    payload.getTemporaryImages(), actorId);
            params.put("contents", imageSave.getHtml());
            params.put("contentsHtml", imageSave.getHtml());
            params.put("contentsJson", imageSave.getJson());
            params.put("contentsText", plainText(imageSave.getHtml()));
            noticeBoardDAO.updateNoticePost(params);
            imageStorageService.completeOwnerSave(tenantId, BOARD_TYPE_NOTICE, postId,
                    toStorageUploads(payload), imageSave.getRetainedFileIds());
        } else {
            noticeBoardDAO.updateNoticePost(params);
        }
        return getPost(tenantId, postId);
    }

    private void putPopupSettings(Map<String, Object> params, NoticeBoardPostSaveRequestVO payload) {
        String enabled = payload.getLoginPopupYn() == null ? "N" : payload.getLoginPopupYn();
        if (!"Y".equals(enabled) && !"N".equals(enabled)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 팝업 여부는 Y 또는 N이어야 합니다.");
        }
        String endDate = null;
        if ("Y".equals(enabled)) {
            String value = payload.getPopupEndDate();
            try {
                if (value == null || !value.matches("\\d{4}-\\d{2}-\\d{2}") || value.startsWith("0000-")) {
                    throw new DateTimeParseException("Invalid date", value == null ? "" : value, 0);
                }
                endDate = LocalDate.parse(value).toString();
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 팝업 종료일을 입력해 주세요.", exception);
            }
        }
        params.put("loginPopupYn", enabled);
        params.put("popupEndDate", endDate);
    }

    private EmbeddedImageDocumentProcessor.Result rewriteAndPromoteEmbeddedImages(
            Long tenantId,
            Long postId,
            String contentsHtml,
            String contentsJson,
            List<NoticeEmbeddedImageVO> embeddedImages,
            List<NoticeEmbeddedImageVO> temporaryImages,
            String uploadedBy) throws Exception {
        JsonNode json = IMAGE_OBJECT_MAPPER.readTree(StringUtils.hasText(contentsJson)
                ? contentsJson : "{\"type\":\"doc\",\"content\":[]}");
        return imageDocumentProcessor.process(
                tenantId,
                BOARD_TYPE_NOTICE,
                postId,
                contentsHtml,
                json,
                toStorageUploads(embeddedImages),
                toStorageUploads(temporaryImages == null ? embeddedImages : temporaryImages),
                uploadedBy,
                noticeImageUrlResolver(postId));
    }

    private EmbeddedImageDocumentProcessor.StableImageUrlResolver noticeImageUrlResolver(final Long postId) {
        return new EmbeddedImageDocumentProcessor.StableImageUrlResolver() {
            @Override
            public String toStableUrl(CommonFileVO image) {
                return stableNoticeImageUrl(image);
            }

            @Override
            public CommonFileVO resolveOwnedImage(String source, List<CommonFileVO> ownedImages) {
                URI uri;
                try {
                    uri = URI.create(source);
                } catch (IllegalArgumentException exception) {
                    throw new IllegalArgumentException("공지 본문 이미지 경로가 올바르지 않습니다.", exception);
                }
                String prefix = "/api/v1/groupware/boards/notice/posts/";
                String path = uri.getPath();
                if (path == null || !path.startsWith(prefix)) {
                    return null;
                }
                String route = path.substring(prefix.length());
                int separator = route.indexOf('/');
                if (separator < 0 || !String.valueOf(postId).equals(route.substring(0, separator))
                        || !"/embedded-images".equals(route.substring(separator))) {
                    throw new IllegalArgumentException("다른 공지사항의 본문 이미지는 사용할 수 없습니다.");
                }
                String objectKey = queryParameter(uri.getRawQuery(), "objectKey");
                CommonFileVO owned = StringUtils.hasText(objectKey)
                        ? findOwnedImage(objectKey, null, ownedImages) : null;
                if (owned == null) {
                    throw new IllegalArgumentException("현재 공지사항에 속한 본문 이미지가 아닙니다.");
                }
                return owned;
            }
        };
    }

    private String queryParameter(String rawQuery, String parameterName) {
        if (!StringUtils.hasText(rawQuery)) {
            return null;
        }
        for (String parameter : rawQuery.split("&")) {
            int separator = parameter.indexOf('=');
            if (separator > 0 && parameterName.equals(parameter.substring(0, separator))) {
                try {
                    return URLDecoder.decode(parameter.substring(separator + 1), "UTF-8");
                } catch (Exception exception) {
                    throw new IllegalArgumentException("공지 본문 이미지 경로가 올바르지 않습니다.", exception);
                }
            }
        }
        return null;
    }

    private void collectJsonUploadTokens(JsonNode node, Set<String> tokens) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            if ("image".equals(node.path("type").asText())) {
                String token = readJsonText(node.path("attrs"), "data-upload-token");
                if (StringUtils.hasText(token)) {
                    tokens.add(token);
                }
            }
            node.elements().forEachRemaining(child -> collectJsonUploadTokens(child, tokens));
        } else if (node.isArray()) {
            node.elements().forEachRemaining(child -> collectJsonUploadTokens(child, tokens));
        }
    }

    private void rewriteHtmlImageNodes(
            Element root,
            Map<String, CommonFileVO> promotedByToken,
            List<CommonFileVO> ownedImages,
            Set<Long> retainedFileIds) throws Exception {
        for (Element image : root.select("img")) {
            CommonFileVO owned = resolveImageOwner(image.attr("data-upload-token"),
                    image.attr("data-object-key"), image.attr("data-file-id"), promotedByToken, ownedImages);
            if (owned == null) {
                if (StringUtils.hasText(image.attr("data-file-id"))
                        || StringUtils.hasText(image.attr("data-upload-token"))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지 소유가 확인되지 않은 본문 이미지입니다.");
                }
                continue;
            }
            setStableImageAttributes(image, owned);
            retainedFileIds.add(owned.getFileId());
        }
    }

    private void rewriteJsonImageNodes(
            JsonNode node,
            Map<String, CommonFileVO> promotedByToken,
            List<CommonFileVO> ownedImages,
            Set<Long> retainedFileIds) {
        if (node == null) {
            return;
        }
        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            if ("image".equals(object.path("type").asText())) {
                JsonNode sourceAttributes = object.get("attrs");
                ObjectNode attributes = sourceAttributes instanceof ObjectNode
                        ? (ObjectNode) sourceAttributes : object.putObject("attrs");
                String uploadToken = readJsonText(attributes, "data-upload-token");
                String objectKey = readJsonText(attributes, "data-object-key");
                String fileId = readJsonText(attributes, "data-file-id");
                CommonFileVO owned = resolveImageOwner(uploadToken, objectKey, fileId,
                        promotedByToken, ownedImages);
                if (owned == null && (StringUtils.hasText(fileId) || StringUtils.hasText(uploadToken))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "공지 소유가 확인되지 않은 본문 이미지입니다.");
                }
                if (owned != null) {
                    setStableImageAttributes(attributes, owned);
                    retainedFileIds.add(owned.getFileId());
                }
            }
            object.elements().forEachRemaining(child ->
                    rewriteJsonImageNodes(child, promotedByToken, ownedImages, retainedFileIds));
        } else if (node.isArray()) {
            node.elements().forEachRemaining(child ->
                    rewriteJsonImageNodes(child, promotedByToken, ownedImages, retainedFileIds));
        }
    }

    private String readJsonText(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        return value.isNull() || value.isMissingNode() ? "" : value.asText();
    }

    private CommonFileVO resolveImageOwner(
            String token,
            String objectKey,
            String fileId,
            Map<String, CommonFileVO> promotedByToken,
            List<CommonFileVO> ownedImages) {
        CommonFileVO byToken = StringUtils.hasText(token) ? promotedByToken.get(token) : null;
        if (byToken != null) {
            return byToken;
        }
        return findOwnedImage(objectKey, fileId, ownedImages);
    }

    private CommonFileVO findOwnedImage(String objectKey, String fileId, List<CommonFileVO> ownedImages) {
        if (ownedImages == null) {
            return null;
        }
        for (CommonFileVO image : ownedImages) {
            if (image == null || image.getFileId() == null) {
                continue;
            }
            if (StringUtils.hasText(objectKey) && objectKey.equals(image.getObjectKey())) {
                return image;
            }
            if (StringUtils.hasText(fileId) && String.valueOf(image.getFileId()).equals(fileId)) {
                return image;
            }
        }
        return null;
    }

    private void setStableImageAttributes(Element image, CommonFileVO owned) throws Exception {
        image.attr("src", stableNoticeImageUrl(owned));
        image.attr("data-file-id", String.valueOf(owned.getFileId()));
        image.attr("data-object-key", owned.getObjectKey());
        removeTransientImageAttributes(image);
    }

    private void setStableImageAttributes(ObjectNode attributes, CommonFileVO owned) {
        attributes.put("src", stableNoticeImageUrl(owned));
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
    }

    private String stableNoticeImageUrl(CommonFileVO image) {
        try {
            return "/api/v1/groupware/boards/notice/posts/" + image.getOwnerId()
                    + "/embedded-images?objectKey=" + URLEncoder.encode(image.getObjectKey(), "UTF-8");
        } catch (Exception exception) {
            throw new IllegalStateException("공지 본문 이미지 경로를 만들지 못했습니다.", exception);
        }
    }

    private String plainText(String html) {
        return Jsoup.parseBodyFragment(html == null ? "" : html).text();
    }

    private List<EmbeddedImageUploadVO> toStorageUploads(NoticeBoardPostSaveRequestVO payload) {
        List<NoticeEmbeddedImageVO> session = payload.getTemporaryImages() != null
            ? payload.getTemporaryImages() : payload.getEmbeddedImages();
        return toStorageUploads(session);
    }

    private List<EmbeddedImageUploadVO> toStorageUploads(
            List<NoticeEmbeddedImageVO> images) {
        List<EmbeddedImageUploadVO> uploads = new ArrayList<EmbeddedImageUploadVO>();
        if (images != null) {
            for (NoticeEmbeddedImageVO image : images) {
                if (image == null) {
                    continue;
                }
                EmbeddedImageUploadVO mapped = new EmbeddedImageUploadVO();
                mapped.setUploadToken(image.getUploadToken());
                mapped.setFileName(image.getFileName());
                uploads.add(mapped);
            }
        }
        return uploads;
    }

    @Override
    @Transactional
    public void updatePinned(Long tenantId, Long postId, String isPinned, String actorId, String actorName)
            throws Exception {
        HashMap<String, Object> existingParams = new HashMap<>();
        existingParams.put("tenantId", tenantId);
        existingParams.put("postId", postId);
        existingParams.put("boardTypeCode", BOARD_TYPE_NOTICE);
        if (noticeBoardDAO.selectNoticePostById(existingParams) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }

        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        params.put("isPinned", StringUtils.hasText(isPinned) ? isPinned.trim().toUpperCase() : "N");
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
        noticeBoardDAO.updateNoticePostPinned(params);
    }

    @Override
    @Transactional
    public void deletePost(Long tenantId, Long postId) throws Exception {
        deletePost(tenantId, postId, null, null);
    }

    @Override
    @Transactional
    public void deletePost(Long tenantId, Long postId, String actorId, String actorName) throws Exception {
        HashMap<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        NoticeBoardPostVO existing = noticeBoardDAO.selectNoticePostById(params);
        if (existing == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다.");
        }
        params.put("lastModifiedBy", actorId);
        params.put("lastModifiedByName", actorName);
        List<CommonFileVO> attachments = commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId);
        if (attachments != null) {
            for (CommonFileVO attachment : attachments) {
                if (attachment.getFileId() != null
                        && !"EMBEDDED".equalsIgnoreCase(attachment.getFileUsageType())) {
                    commonFileService.deleteFile(tenantId, BOARD_TYPE_NOTICE, postId, attachment.getFileId());
                }
            }
        }
        if (imageStorageService != null) {
            imageStorageService.completeOwnerSave(tenantId, BOARD_TYPE_NOTICE, postId,
                    Collections.<EmbeddedImageUploadVO>emptyList(), Collections.<Long>emptySet());
        } else {
            noticeBoardDAO.softDeleteEmbeddedNoticeAttachments(params);
        }
        noticeBoardDAO.softDeleteNoticePost(params);
    }

    @Override
    @Transactional
    public NoticeBoardFileVO uploadAttachment(Long tenantId, Long postId, MultipartFile file, String uploaderId) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }
        getPost(tenantId, postId);

        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }

        CommonFileVO uploaded = commonFileService.uploadFile(tenantId, "NOTICE", postId, file, uploaderId);
        if (uploaded == null || uploaded.getFileId() == null) {
            return null;
        }

        return toNoticeBoardFile(uploaded);
    }

    private NoticeBoardFileVO toNoticeBoardFile(CommonFileVO source) {
        NoticeBoardFileVO target = new NoticeBoardFileVO();
        target.setBoardFileId(source.getFileId());
        target.setPostId(source.getOwnerId());
        target.setFileName(source.getFileName());
        target.setFilePath(source.getFilePath());
        target.setObjectKey(source.getObjectKey());
        target.setBucketName(source.getBucketName());
        target.setStorageProvider(source.getStorageProvider());
        target.setFileSize(source.getFileSize());
        target.setMimeType(source.getMimeType());
        target.setContentType(source.getContentType());
        target.setFileUsageType(StringUtils.hasText(source.getFileUsageType())
            ? source.getFileUsageType() : "ATTACHMENT");
        target.setDeletedYn(source.getDeletedYn());
        target.setUploadedBy(source.getUploadedBy());
        target.setCreatedAt(source.getCreatedAt());
        target.setUpdatedAt(source.getUpdatedAt());
        return target;
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long boardFileId) throws Exception {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지사항 첨부파일 소유 정보가 필요합니다.");
    }

    @Override
    @Transactional
    public void deleteAttachment(Long tenantId, Long postId, Long boardFileId) throws Exception {
        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }
        validateNoticeAttachment(tenantId, postId, boardFileId);
        commonFileService.deleteFile(tenantId, BOARD_TYPE_NOTICE, postId, boardFileId);
    }

    @Override
    public void downloadAttachment(Long tenantId, Long boardFileId, HttpServletResponse response) throws Exception {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지사항 첨부파일 소유 정보가 필요합니다.");
    }

    @Override
    public void downloadAttachment(Long tenantId, Long postId, Long boardFileId, HttpServletResponse response) throws Exception {
        if (commonFileService == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "공통 첨부 서비스가 준비되지 않았습니다.");
        }
        validateNoticeAttachment(tenantId, postId, boardFileId);
        commonFileService.downloadFile(tenantId, BOARD_TYPE_NOTICE, postId, boardFileId, response);
    }

    @Override
    public void streamEmbeddedImage(Long tenantId, Long postId, String objectKey, HttpServletResponse response)
            throws Exception {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
        if (postId == null || !StringUtils.hasText(objectKey)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "본문 이미지 경로가 없습니다.");
        }
        HashMap<String, Object> params = new HashMap<String, Object>();
        params.put("tenantId", tenantId);
        params.put("postId", postId);
        params.put("boardTypeCode", BOARD_TYPE_NOTICE);
        if (noticeBoardDAO.selectNoticePostById(params) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "본문 이미지를 찾을 수 없습니다.");
        }
        List<CommonFileVO> files = commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId);
        if (files == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "본문 이미지를 찾을 수 없습니다.");
        }
        for (CommonFileVO file : files) {
            if (file != null && "EMBEDDED".equalsIgnoreCase(file.getFileUsageType())
                    && objectKey.equals(file.getObjectKey())) {
                if (imageStorageService != null) {
                    imageStorageService.streamOwnedImage(
                            tenantId, BOARD_TYPE_NOTICE, postId, file.getFileId(), response);
                    return;
                }
                commonFileService.downloadFile(tenantId, BOARD_TYPE_NOTICE, postId,
                    file.getFileId(), response);
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "본문 이미지를 찾을 수 없습니다.");
    }

    private String rewriteEmbeddedImageSources(
            String html, Long postId, List<CommonFileVO> embeddedFiles) throws Exception {
        if (!StringUtils.hasText(html) || embeddedFiles == null || embeddedFiles.isEmpty()) {
            return html;
        }
        Document document = Jsoup.parseBodyFragment(html);
        for (Element image : document.body().select("img")) {
            CommonFileVO owner = findOwnedImage(
                    image.attr("data-object-key"), image.attr("data-file-id"), embeddedFiles);
            if (owner != null) {
                image.attr("src", stableNoticeImageUrl(owner));
                image.attr("data-file-id", String.valueOf(owner.getFileId()));
                image.attr("data-object-key", owner.getObjectKey());
            }
            removeTransientImageAttributes(image);
        }
        return document.body().html();
    }

    private String rewriteEmbeddedImageJsonSources(
            String json, Long postId, List<CommonFileVO> embeddedFiles) throws Exception {
        if (!StringUtils.hasText(json) || embeddedFiles == null || embeddedFiles.isEmpty()) {
            return json;
        }
        JsonNode document = IMAGE_OBJECT_MAPPER.readTree(json);
        ObjectNode rewritten = document instanceof ObjectNode
                ? (ObjectNode) document.deepCopy() : IMAGE_OBJECT_MAPPER.createObjectNode();
        rewriteJsonImageNodes(rewritten, Collections.<String, CommonFileVO>emptyMap(), embeddedFiles,
                new HashSet<Long>());
        return IMAGE_OBJECT_MAPPER.writeValueAsString(rewritten);
    }

    private void validateNoticeAttachment(Long tenantId, Long postId, Long boardFileId) throws Exception {
        if (postId == null || boardFileId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지사항 첨부파일 소유 정보가 필요합니다.");
        }
        List<CommonFileVO> files = commonFileService.listFiles(tenantId, BOARD_TYPE_NOTICE, postId);
        boolean owned = files != null && files.stream()
            .anyMatch(file -> Objects.equals(file.getFileId(), boardFileId)
                && !"EMBEDDED".equalsIgnoreCase(file.getFileUsageType()));
        if (!owned) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "공지사항 첨부파일을 찾을 수 없습니다.");
        }
    }

    private void validateCreatePayload(NoticeBoardPostSaveRequestVO payload) {
        if (payload == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "요청 본문이 비어 있습니다.");
        }

        if (!StringUtils.hasText(payload.getTitle())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목은 필수입니다.");
        }
        String contentsHtml = payload.getEffectiveContentsHtml();
        if (!StringUtils.hasText(contentsHtml)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내용은 필수입니다.");
        }
        if (!StringUtils.hasText(payload.getNoticeGubunCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공지 구분은 필수입니다.");
        }
    }

    private void validateCategory(Long tenantId, String categoryCode) throws Exception {
        if (categoryValidator != null) {
            categoryValidator.validate(tenantId, BOARD_TYPE_NOTICE, categoryCode);
        }
    }

    private void requireImageStorageIfNeeded(NoticeBoardPostSaveRequestVO payload) {
        if (imageStorageService == null
                && ((payload.getEmbeddedImages() != null && !payload.getEmbeddedImages().isEmpty())
                    || (payload.getTemporaryImages() != null && !payload.getTemporaryImages().isEmpty()))) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "공통 본문 이미지 저장소가 준비되지 않았습니다.");
        }
    }

}
