package egovframework.let.groupware.community.archive.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletResponse;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.property.EgovPropertyService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovAccessControlHelper;
import egovframework.com.common.domain.model.CommonFileVO;
import egovframework.com.common.service.CommonFileService;
import egovframework.let.common.dto.ListResult;
import egovframework.let.common.pagination.EgovPaginationSupport;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileItemVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileSearchVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileUpdateRequestVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostSaveRequestVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostSearchVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostVO;
import egovframework.let.groupware.community.archive.domain.repository.ArchiveBoardDAO;
import egovframework.let.groupware.community.archive.service.ArchiveBoardService;
import egovframework.let.groupware.community.common.CommunityCategoryValidator;

@Service("archiveBoardService")
public class ArchiveBoardServiceImpl extends EgovAbstractServiceImpl implements ArchiveBoardService {
    private static final String ARCHIVE = "ARCHIVE";
    private static final List<String> ARCHIVE_FILE_TYPES = Arrays.asList(
            "DOCUMENT", "SPREADSHEET", "PRESENTATION", "PDF", "IMAGE", "VIDEO", "ARCHIVE");
    private final ArchiveBoardDAO archiveBoardDAO;
    private final CommonFileService commonFileService;
    private final CommunityCategoryValidator categoryValidator;

    @Resource(name = "propertiesService")
    private EgovPropertyService propertyService;

    public ArchiveBoardServiceImpl(ArchiveBoardDAO archiveBoardDAO, CommonFileService commonFileService,
            CommunityCategoryValidator categoryValidator) {
        this.archiveBoardDAO = archiveBoardDAO;
        this.commonFileService = commonFileService;
        this.categoryValidator = categoryValidator;
    }

    @Override
    public ListResult<ArchiveBoardFileItemVO> listFiles(ArchiveBoardFileSearchVO search, LoginVO user) throws Exception {
        requireAuthenticated(user);
        requireBoard();
        ArchiveBoardFileSearchVO actual = search == null ? new ArchiveBoardFileSearchVO() : search;
        String keyword = StringUtils.hasText(actual.getKeyword()) ? actual.getKeyword().trim() : null;
        String folderCode = StringUtils.hasText(actual.getFolderCode()) ? actual.getFolderCode().trim() : null;
        String uploadedFrom = normalizeDate(actual.getUploadedFrom());
        String uploadedTo = normalizeDate(actual.getUploadedTo());
        validateDateRange(uploadedFrom, uploadedTo);
        String fileType = normalizeFileType(actual.getFileType());

        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("keyword", keyword);
        params.put("folderCode", folderCode);
        params.put("rootOnly", folderCode == null);
        if (uploadedFrom != null) {
            params.put("uploadedFrom", uploadedFrom);
        }
        if (uploadedTo != null) {
            params.put("uploadedTo", uploadedTo);
        }
        if (fileType != null) {
            params.put("fileType", fileType);
        }

        List<ArchiveBoardFileItemVO> files = archiveBoardDAO.selectArchiveFileList(params);
        Long count = archiveBoardDAO.selectArchiveFileCount(params);
        return new ListResult<>(files == null ? new ArrayList<>() : files, count == null ? 0L : count);
    }

    private String normalizeDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim();
        try {
            LocalDate.parse(normalized);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드 날짜를 확인해 주세요.");
        }
        return normalized;
    }

    private void validateDateRange(String uploadedFrom, String uploadedTo) {
        if (uploadedFrom == null || uploadedTo == null) {
            return;
        }
        if (LocalDate.parse(uploadedFrom).isAfter(LocalDate.parse(uploadedTo))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작일은 종료일보다 늦을 수 없습니다.");
        }
    }

    private String normalizeFileType(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if ("ALL".equals(normalized)) {
            return null;
        }
        if (!ARCHIVE_FILE_TYPES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 유형을 확인해 주세요.");
        }
        return normalized;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveBoardFileItemVO uploadFile(MultipartFile file, String folderCode, LoginVO user) throws Exception {
        requireMutation(user, true);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }

        String rawName = file.getOriginalFilename();
        String title = StringUtils.cleanPath(Objects.toString(rawName, "")).trim();
        if (!StringUtils.hasText(title) || title.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일명을 확인해 주세요.");
        }

        String normalizedFolderCode = StringUtils.hasText(folderCode) ? folderCode.trim() : null;
        if (normalizedFolderCode != null) {
            categoryValidator.validate(user.getTenantId(), ARCHIVE, normalizedFolderCode);
        }

        Map<String, Object> insertParams = postParams(user, null);
        insertParams.put("writerId", user.getId());
        insertParams.put("writerName", user.getName());
        insertParams.put("title", title);
        insertParams.put("categoryCode", normalizedFolderCode);
        insertParams.put("contents", null);
        insertParams.put("contentsText", null);

        Long postId = archiveBoardDAO.insertArchivePost(insertParams);
        if (postId == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "자료를 저장하지 못했습니다.");
        }

        try {
            CommonFileVO uploaded = commonFileService.uploadFile(user.getTenantId(), ARCHIVE, postId, file, user.getId());
            if (uploaded == null || uploaded.getFileId() == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일을 저장하지 못했습니다.");
            }
            Map<String, Object> lookup = postParams(user, postId);
            lookup.put("boardFileId", uploaded.getFileId());
            ArchiveBoardFileItemVO item = archiveBoardDAO.selectArchiveFileItemById(lookup);
            if (item == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "업로드 결과를 조회하지 못했습니다.");
            }
            return item;
        } catch (Exception ex) {
            archiveBoardDAO.softDeleteArchivePost(postParams(user, postId));
            throw ex;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveBoardFileItemVO updateFile(Long boardFileId, ArchiveBoardFileUpdateRequestVO payload, LoginVO user)
            throws Exception {
        requireMutation(user, false);
        if (boardFileId == null || payload == null || payload.getPostId() == null || !StringUtils.hasText(payload.getFileName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일 정보를 확인해 주세요.");
        }

        String fileName = payload.getFileName().trim();
        if (fileName.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "파일명을 확인해 주세요.");
        }

        ArchiveBoardFileVO file = requireAttachment(payload.getPostId(), boardFileId, user);
        String categoryCode = StringUtils.hasText(payload.getFolderCode()) ? payload.getFolderCode().trim() : null;
        if (categoryCode != null) {
            categoryValidator.validate(user.getTenantId(), ARCHIVE, categoryCode);
        }

        Map<String, Object> params = postParams(user, payload.getPostId());
        params.put("boardFileId", boardFileId);
        params.put("fileName", fileName);
        params.put("categoryCode", categoryCode);
        archiveBoardDAO.updateArchiveFileNameAndCategory(params);
        archiveBoardDAO.updateArchivePostCategoryAndTitle(params);

        Map<String, Object> lookup = postParams(user, file.getPostId());
        lookup.put("boardFileId", boardFileId);
        ArchiveBoardFileItemVO item = archiveBoardDAO.selectArchiveFileItemById(lookup);
        if (item == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
        return item;
    }

    @Override
    public ListResult<ArchiveBoardPostVO> listPosts(ArchiveBoardPostSearchVO search, LoginVO user) throws Exception {
        requireAuthenticated(user);
        requireBoard();
        if (search == null) {
            search = new ArchiveBoardPostSearchVO();
        }
        search.setTenantId(user.getTenantId());
        if (search.getPageIndex() < 1 || search.getPageUnit() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "페이지 정보가 올바르지 않습니다.");
        }
        String category = search.getCategoryCode();
        if (category != null) {
            category = category.trim();
            categoryValidator.validate(user.getTenantId(), ARCHIVE, category);
        }
        EgovPaginationSupport.apply(search, propertyService);
        Map<String, Object> params = postParams(user, null);
        params.put("keyword", StringUtils.hasText(search.getKeyword()) ? search.getKeyword().trim() : null);
        params.put("categoryCode", category);
        params.put("firstIndex", search.getFirstIndex());
        params.put("recordCountPerPage", search.getRecordCountPerPage());
        List<ArchiveBoardPostVO> posts = archiveBoardDAO.selectArchivePostList(params);
        Long count = archiveBoardDAO.selectArchivePostCount(params);
        return new ListResult<>(posts == null ? new ArrayList<>() : posts, count == null ? 0L : count);
    }

    @Override
    public ArchiveBoardPostVO getPost(Long postId, LoginVO user) throws Exception {
        requireAuthenticated(user);
        requireBoard();
        ArchiveBoardPostVO post = requirePost(postId, user);
        List<ArchiveBoardFileVO> attachments = new ArrayList<>();
        for (CommonFileVO file : ownedFiles(postId, user)) {
            attachments.add(toArchiveFile(file));
        }
        post.setAttachments(attachments);
        post.setAttachmentCount((long) attachments.size());
        return post;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveBoardPostVO createPost(ArchiveBoardPostSaveRequestVO payload, LoginVO user) throws Exception {
        requireMutation(user, false);
        Map<String, Object> params = saveParams(null, payload, user);
        Long postId = archiveBoardDAO.insertArchivePost(params);
        if (postId == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "자료를 저장하지 못했습니다.");
        }
        return getPost(postId, user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveBoardPostVO updatePost(Long postId, ArchiveBoardPostSaveRequestVO payload, LoginVO user) throws Exception {
        requireMutation(user, false);
        requirePost(postId, user);
        if (archiveBoardDAO.updateArchivePost(saveParams(postId, payload, user)) != 1) {
            throw missingPost();
        }
        return getPost(postId, user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deletePost(Long postId, LoginVO user) throws Exception {
        requireMutation(user, false);
        requirePostForUpdate(postId, user);
        for (CommonFileVO file : ownedFiles(postId, user)) {
            commonFileService.deleteFile(user.getTenantId(), ARCHIVE, postId, file.getFileId());
        }
        if (archiveBoardDAO.softDeleteArchivePost(postParams(user, postId)) != 1) {
            throw missingPost();
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ArchiveBoardFileVO uploadAttachment(Long postId, MultipartFile file, LoginVO user) throws Exception {
        requireMutation(user, true);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }
        requirePostForUpdate(postId, user);
        CommonFileVO uploaded = commonFileService.uploadFile(user.getTenantId(), ARCHIVE, postId, file, user.getId());
        if (!isOwnedAttachment(uploaded, postId, user)) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "첨부파일을 저장하지 못했습니다.");
        }
        return toArchiveFile(uploaded);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteAttachment(Long postId, Long boardFileId, LoginVO user) throws Exception {
        requireMutation(user, false);
        requireAttachment(postId, boardFileId, user);
        commonFileService.deleteFile(user.getTenantId(), ARCHIVE, postId, boardFileId);
        List<CommonFileVO> remaining = ownedFiles(postId, user);
        if (remaining.isEmpty()) {
            archiveBoardDAO.softDeleteArchivePost(postParams(user, postId));
        }
    }

    @Override
    public void downloadAttachment(Long postId, Long boardFileId, HttpServletResponse response, LoginVO user)
            throws Exception {
        requireAuthenticated(user);
        requireBoard();
        requireAttachment(postId, boardFileId, user);
        commonFileService.downloadFile(user.getTenantId(), ARCHIVE, postId, boardFileId, response);
    }

    private Map<String, Object> saveParams(Long postId, ArchiveBoardPostSaveRequestVO payload, LoginVO user)
            throws Exception {
        if (payload == null || !StringUtils.hasText(payload.getTitle())
                || payload.getTitle().trim().length() > 200 || !StringUtils.hasText(payload.getCategoryCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목과 자료 분류를 확인해 주세요.");
        }
        categoryValidator.validate(user.getTenantId(), ARCHIVE, payload.getCategoryCode());
        Map<String, Object> params = postParams(user, postId);
        params.put("title", payload.getTitle().trim());
        params.put("categoryCode", payload.getCategoryCode().trim());
        params.put("contents", payload.getContents());
        params.put("contentsText", payload.getContents());
        params.put("writerId", user.getId());
        params.put("writerName", user.getName());
        return params;
    }

    private Map<String, Object> postParams(LoginVO user, Long postId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", user.getTenantId());
        params.put("boardTypeCode", ARCHIVE);
        params.put("postId", postId);
        params.put("lastModifiedBy", user.getId());
        params.put("lastModifiedByName", user.getName());
        return params;
    }

    private ArchiveBoardPostVO requirePost(Long postId, LoginVO user) throws Exception {
        requireId(postId);
        ArchiveBoardPostVO post = archiveBoardDAO.selectArchivePostById(postParams(user, postId));
        if (post == null) {
            throw missingPost();
        }
        return post;
    }

    private ArchiveBoardPostVO requirePostForUpdate(Long postId, LoginVO user) throws Exception {
        requireId(postId);
        ArchiveBoardPostVO post = archiveBoardDAO.selectArchivePostForUpdate(postParams(user, postId));
        if (post == null) {
            throw missingPost();
        }
        return post;
    }

    private ArchiveBoardFileVO requireAttachment(Long postId, Long boardFileId, LoginVO user) throws Exception {
        requirePost(postId, user);
        requireId(boardFileId);
        Map<String, Object> params = postParams(user, postId);
        params.put("boardFileId", boardFileId);
        ArchiveBoardFileVO file = archiveBoardDAO.selectArchiveAttachmentById(params);
        if (file == null || !Objects.equals(file.getBoardFileId(), boardFileId)
                || !Objects.equals(file.getTenantId(), user.getTenantId()) || !Objects.equals(file.getPostId(), postId)
                || !ARCHIVE.equals(file.getOwnerType()) || !"ATTACHMENT".equals(file.getFileUsageType())
                || !"N".equals(file.getDeletedYn())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "첨부파일을 찾을 수 없습니다.");
        }
        return file;
    }

    private List<CommonFileVO> ownedFiles(Long postId, LoginVO user) throws Exception {
        List<CommonFileVO> files = commonFileService.listFiles(user.getTenantId(), ARCHIVE, postId);
        List<CommonFileVO> owned = new ArrayList<>();
        if (files != null) {
            for (CommonFileVO file : files) {
                if (isOwnedAttachment(file, postId, user)) {
                    owned.add(file);
                }
            }
        }
        return owned;
    }

    private boolean isOwnedAttachment(CommonFileVO file, Long postId, LoginVO user) {
        return file != null && file.getFileId() != null && Objects.equals(file.getTenantId(), user.getTenantId())
                && ARCHIVE.equals(file.getOwnerType()) && Objects.equals(file.getOwnerId(), postId)
                && "ATTACHMENT".equals(file.getFileUsageType()) && "N".equals(file.getDeletedYn());
    }

    private ArchiveBoardFileVO toArchiveFile(CommonFileVO file) {
        ArchiveBoardFileVO result = new ArchiveBoardFileVO();
        result.setBoardFileId(file.getFileId());
        result.setPostId(file.getOwnerId());
        result.setTenantId(file.getTenantId());
        result.setOwnerType(file.getOwnerType());
        result.setFileName(file.getFileName());
        result.setFileSize(file.getFileSize());
        result.setMimeType(file.getMimeType());
        result.setContentType(file.getContentType());
        result.setFileUsageType(file.getFileUsageType());
        result.setDeletedYn(file.getDeletedYn());
        result.setCreatedAt(file.getCreatedAt());
        result.setUpdatedAt(file.getUpdatedAt());
        return result;
    }

    private Map<String, Object> requireBoard() throws Exception {
        Map<String, Object> board = archiveBoardDAO.selectArchiveBoardConfig();
        if (board == null || !"Y".equals(board.get("useYn"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자료실을 사용할 수 없습니다.");
        }
        return board;
    }

    private void requireMutation(LoginVO user, boolean uploading) throws Exception {
        requireAuthenticated(user);
        if (!EgovAccessControlHelper.isTenantAdmin(user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }
        Map<String, Object> board = requireBoard();
        Object policy = board.get("writeAuthLevel");
        if (!"ADMIN".equals(policy) && !"MEMBER".equals(policy) && !"ALL".equals(policy)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "자료실 작성 권한이 없습니다.");
        }
        if (uploading && !"Y".equals(board.get("fileUploadYn"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "첨부파일 업로드를 사용할 수 없습니다.");
        }
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }

    private void requireId(Long id) {
        if (id == null || id < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자료 또는 첨부파일 ID가 올바르지 않습니다.");
        }
    }

    private ResponseStatusException missingPost() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "자료를 찾을 수 없습니다.");
    }
}
