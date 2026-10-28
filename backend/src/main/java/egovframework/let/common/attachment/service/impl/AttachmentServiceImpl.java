package egovframework.let.common.attachment.service.impl;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import egovframework.let.common.attachment.domain.model.AttachmentUploadResultVO;
import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.domain.repository.AttachmentDAO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.common.attachment.service.AttachmentStorage;

/**
 * 첨부 파일 서비스 구현 클래스 (송연 attachments.py list_attachments · save_upload · delete_attachments_for · /api/attachments 를 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Service("attachmentService")
public class AttachmentServiceImpl extends EgovAbstractServiceImpl implements AttachmentService {

    /** 한 파일당 상한(송연과 같음) */
    static final long MAX_FILE_BYTES = 30L * 1024 * 1024;
    /** 범용 첨부 API 로 받는 갈래. 문서함(document)은 폴더 권한을 따져야 해서 문서함 API(…Document)로만 다룬다. */
    static final List<String> ALLOWED_SCOPES = Arrays.asList("receiving");
    static final String DOCUMENT_SCOPE = "document";
    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final AttachmentDAO attachmentDAO;
    private final AttachmentStorage attachmentStorage;

    public AttachmentServiceImpl(AttachmentDAO attachmentDAO, AttachmentStorage attachmentStorage) {
        this.attachmentDAO = attachmentDAO;
        this.attachmentStorage = attachmentStorage;
    }

    @Override
    public Map<String, List<AttachmentVO>> listByRefs(String scope, List<String> refIds) throws Exception {
        Map<String, List<AttachmentVO>> out = new LinkedHashMap<>();
        for (AttachmentVO a : attachmentDAO.selectByRefs(scope, refIds)) {
            List<AttachmentVO> list = out.get(a.getRefId());
            if (list == null) {
                list = new ArrayList<>();
                out.put(a.getRefId(), list);
            }
            list.add(a);
        }
        return out;
    }

    @Override
    public AttachmentUploadResultVO upload(String scope, String refId, List<MultipartFile> files, String userName) throws Exception {
        String s = scope == null ? "" : scope.trim();
        String r = refId == null ? "" : refId.trim();
        if (!ALLOWED_SCOPES.contains(s)) {
            throw new IllegalArgumentException("알 수 없는 첨부 대상입니다");
        }
        if (r.isEmpty()) {
            throw new IllegalArgumentException("첨부할 대상이 필요합니다");
        }
        return save(s, r, files, userName);
    }

    @Override
    public AttachmentUploadResultVO uploadDocuments(long folderId, List<MultipartFile> files, String userName) throws Exception {
        return save(DOCUMENT_SCOPE, String.valueOf(folderId), files, userName);
    }

    private AttachmentUploadResultVO save(String s, String r, List<MultipartFile> files, String userName) throws Exception {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("파일이 없습니다");
        }
        int saved = 0;
        List<String> errors = new ArrayList<>();
        for (MultipartFile file : files) {
            String orig = file.getOriginalFilename() == null || file.getOriginalFilename().isEmpty() ? "file" : file.getOriginalFilename();
            byte[] raw = file.getBytes();
            if (raw.length == 0) {
                errors.add(orig + ": 빈 파일입니다");
                continue;
            }
            if (raw.length > MAX_FILE_BYTES) {
                errors.add(orig + ": 파일이 너무 큽니다 (최대 " + (MAX_FILE_BYTES / 1024 / 1024) + "MB)");
                continue;
            }
            String stored = attachmentStorage.write(s, r, orig, raw);
            AttachmentVO row = new AttachmentVO();
            row.setScope(s);
            row.setRefId(r);
            row.setOrigName(orig);
            row.setStoredName(stored);
            row.setSizeBytes((long) raw.length);
            row.setUploadedBy(userName == null ? "" : userName);
            row.setCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(CREATED_AT));
            try {
                attachmentDAO.insertAttachment(row);
            } catch (Exception ex) {
                // 표에 못 남겼으면 써둔 파일도 치운다(주인 없는 파일이 쌓이지 않게)
                attachmentStorage.deleteQuietly(s, r, stored);
                throw ex;
            }
            saved++;
        }
        if (saved == 0) {
            throw new IllegalArgumentException(errors.isEmpty() ? "저장하지 못했습니다" : errors.get(0));
        }
        AttachmentUploadResultVO result = new AttachmentUploadResultVO();
        result.setSaved(saved);
        result.setErrors(errors);
        return result;
    }

    @Override
    public AttachmentVO find(long id) throws Exception {
        AttachmentVO row = attachmentDAO.selectOne(id);
        if (row == null || !ALLOWED_SCOPES.contains(row.getScope())) {
            throw new IllegalArgumentException("파일을 찾을 수 없습니다");
        }
        if (!Files.exists(pathOf(row))) {
            throw new IllegalArgumentException("저장된 파일이 없습니다");
        }
        return row;
    }

    @Override
    public Path pathOf(AttachmentVO attachment) throws Exception {
        return attachmentStorage.file(attachment.getScope(), attachment.getRefId(), attachment.getStoredName());
    }

    @Override
    public void delete(long id) throws Exception {
        AttachmentVO row = attachmentDAO.selectOne(id);
        if (row == null || !ALLOWED_SCOPES.contains(row.getScope())) {
            throw new IllegalArgumentException("파일을 찾을 수 없습니다");
        }
        attachmentDAO.deleteAttachment(id);
        attachmentDAO.deleteShares(id);
        attachmentStorage.deleteQuietly(row.getScope(), row.getRefId(), row.getStoredName());
    }

    @Override
    public AttachmentVO findDocument(long id) throws Exception {
        AttachmentVO row = attachmentDAO.selectOne(id);
        if (row == null || !DOCUMENT_SCOPE.equals(row.getScope())) {
            throw new IllegalArgumentException("파일을 찾을 수 없습니다");
        }
        return row;
    }

    @Override
    public void deleteDocument(long id) throws Exception {
        AttachmentVO row = findDocument(id);
        attachmentDAO.deleteAttachment(id);
        attachmentDAO.deleteShares(id);
        attachmentStorage.deleteQuietly(row.getScope(), row.getRefId(), row.getStoredName());
    }

    @Override
    public void deleteAllFor(String scope, String refId) throws Exception {
        List<AttachmentVO> rows = attachmentDAO.selectByRefs(scope, Arrays.asList(refId));
        attachmentDAO.deleteByRef(scope, refId);
        for (AttachmentVO row : rows) {
            attachmentStorage.deleteQuietly(scope, refId, row.getStoredName());
        }
    }
}
