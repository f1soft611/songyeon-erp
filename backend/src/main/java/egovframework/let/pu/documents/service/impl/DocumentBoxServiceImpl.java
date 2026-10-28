package egovframework.let.pu.documents.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import egovframework.let.common.attachment.domain.model.AttachmentUploadResultVO;
import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.pu.documents.domain.model.DocFileVO;
import egovframework.let.pu.documents.domain.model.DocFolderSaveVO;
import egovframework.let.pu.documents.domain.model.DocFolderVO;
import egovframework.let.pu.documents.domain.model.DocLockRequestVO;
import egovframework.let.pu.documents.domain.model.DocPersonVO;
import egovframework.let.pu.documents.domain.model.DocShareRequestVO;
import egovframework.let.pu.documents.domain.model.DocShareResultVO;
import egovframework.let.pu.documents.domain.model.DocShareRowVO;
import egovframework.let.pu.documents.domain.model.DocShareVO;
import egovframework.let.pu.documents.domain.model.DocUserVO;
import egovframework.let.pu.documents.domain.repository.DocumentBoxDAO;
import egovframework.let.pu.documents.service.DocumentBoxService;
import egovframework.let.pu.documents.service.DocumentUnlockStore;
import egovframework.let.uat.uia.service.impl.WerkzeugPasswordVerifier;

/**
 * 구매관리 - 문서함 서비스 구현 클래스 (송연 attachments.py 의 규칙을 그대로 옮김)
 *
 * ■ 누가 볼 수 있나 — 누구 것인지는 최상위 폴더에만 적혀 있고, 하위폴더는 위로 거슬러 올라가 최상위 것을 따른다.
 *   공용 + 부서 없음  전사 공용. 누구나(이 프로젝트는 메뉴 권한이 없어 '문서함 권한' 검사는 뺐다).
 *   공용 + 부서 있음  그 부서 사람만.
 *   개인             올린 본인만. 관리자(employees.is_admin)는 볼 수 있다(퇴사·감사 때 꺼내야 하므로).
 *   나에게 공유된 폴더(또는 그 윗폴더가 공유된 것)는 볼 수만 있다. 공유는 '보여준다' 는 뜻이지 '같이 쓴다' 는 뜻이 아니다.
 *
 * ■ 폴더 잠금 — 비밀번호를 걸면 그 폴더와 그 아래 전부가 잠긴다. 한 번 풀면 로그아웃할 때까지 열려 있다.
 *   관리자는 비밀번호 없이 연다. 사람이 그만두거나 비밀번호를 잊어서 아무도 못 여는 폴더가 남는 쪽이 더 큰 문제다.
 *   공유받았어도 잠금은 그대로다. 보낸 사람이 비밀번호를 따로 알려준다.
 *
 * ■ parent_id 가 어쩌다 고리를 이루면 영원히 돌게 되므로, 거슬러 올라갈 때는 지나온 곳을 적어두고 멈춘다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("documentBoxService")
public class DocumentBoxServiceImpl extends EgovAbstractServiceImpl implements DocumentBoxService {

    static final String PUBLIC = "공용";
    static final String PERSONAL = "개인";
    private static final String NO_RIGHT = "이 폴더에 대한 권한이 없습니다. 관리자에게 문의해주세요.";
    private static final String NOT_FOUND = "폴더를 찾을 수 없습니다";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final DocumentBoxDAO documentBoxDAO;
    private final AttachmentService attachmentService;
    private final DocumentUnlockStore unlockStore;
    private final WerkzeugPasswordVerifier passwordVerifier;

    public DocumentBoxServiceImpl(DocumentBoxDAO documentBoxDAO, AttachmentService attachmentService,
            DocumentUnlockStore unlockStore, WerkzeugPasswordVerifier passwordVerifier) {
        this.documentBoxDAO = documentBoxDAO;
        this.attachmentService = attachmentService;
        this.unlockStore = unlockStore;
        this.passwordVerifier = passwordVerifier;
    }

    /** 한 요청 동안 쓰는 것: 나, 폴더 전부, 내가 열어둔 폴더, 나에게 공유된 폴더(필요할 때 읽음) */
    private final class Ctx {
        final DocUserVO user;
        final Map<Long, DocFolderVO> byId = new LinkedHashMap<>();
        final Set<Long> opened;
        private Set<Long> sharedFolders;

        Ctx(String employeeId) throws Exception {
            this.user = me(employeeId);
            for (DocFolderVO f : documentBoxDAO.selectFolders()) {
                byId.put(f.getId(), f);
            }
            this.opened = unlockStore.openedBy(employeeId);
        }

        Set<Long> sharedFolders() throws Exception {
            if (sharedFolders == null) {
                sharedFolders = new HashSet<>();
                String today = today();
                for (Map<String, Object> row : documentBoxDAO.selectFolderShareExpiry(user.getId())) {
                    if (isLive((String) row.get("expiresAt"), today)) {
                        sharedFolders.add(((Number) row.get("folderId")).longValue());
                    }
                }
            }
            return sharedFolders;
        }

        DocFolderVO folder(long id) {
            DocFolderVO f = byId.get(id);
            if (f == null) {
                throw new IllegalArgumentException(NOT_FOUND);
            }
            return f;
        }
    }

    @Override
    public DocUserVO me(String employeeId) throws Exception {
        DocUserVO user = documentBoxDAO.selectUser(employeeId);
        if (user == null) {
            throw new IllegalArgumentException("누구인지 알 수 없습니다. 다시 로그인해주세요");
        }
        return user;
    }

    // ===== 볼 수 있는지 =====

    private static DocFolderVO rootOf(Ctx ctx, DocFolderVO folder) {
        Set<Long> seen = new HashSet<>();
        DocFolderVO cur = folder;
        while (cur.getParentId() != null && ctx.byId.containsKey(cur.getParentId())) {
            if (!seen.add(cur.getId())) {
                break;
            }
            cur = ctx.byId.get(cur.getParentId());
        }
        return cur;
    }

    static boolean mayAccess(DocUserVO user, DocFolderVO root) {
        if (user.isAdmin()) {
            return true;
        }
        if (PERSONAL.equals(root.getKind())) {
            return root.getOwnerId() != null && root.getOwnerId().equals(user.getId());
        }
        if (isBlank(root.getDepartment())) {
            return true; // 전사 공용
        }
        return root.getDepartment().equals(user.getDepartment() == null ? "" : user.getDepartment());
    }

    /** 이 폴더가, 또는 이 폴더를 담은 어느 윗폴더가 나에게 공유된 것인지. 공유된 그 폴더 번호(없으면 null) */
    private static Long sharedRootOf(Ctx ctx, DocFolderVO folder) throws Exception {
        Set<Long> shared = ctx.sharedFolders();
        if (shared.isEmpty()) {
            return null;
        }
        Set<Long> seen = new HashSet<>();
        DocFolderVO cur = folder;
        while (cur != null) {
            if (!seen.add(cur.getId())) {
                return null;
            }
            if (shared.contains(cur.getId())) {
                return cur.getId();
            }
            cur = cur.getParentId() == null ? null : ctx.byId.get(cur.getParentId());
        }
        return null;
    }

    /** 이 폴더(자기 자신 포함)를 막고 있는 잠긴 폴더. 이미 푼 것은 막지 않는다 */
    private static DocFolderVO lockedGate(Ctx ctx, DocFolderVO folder) {
        if (ctx.user.isAdmin()) {
            return null;
        }
        Set<Long> seen = new HashSet<>();
        DocFolderVO cur = folder;
        while (cur != null) {
            if (!seen.add(cur.getId())) {
                return null;
            }
            if (!isBlank(cur.getLockHash()) && !ctx.opened.contains(cur.getId())) {
                return cur;
            }
            cur = cur.getParentId() == null ? null : ctx.byId.get(cur.getParentId());
        }
        return null;
    }

    /** 이 폴더를 막고 있는 잠긴 '윗' 폴더. 자기 자신의 잠금은 안 센다(잠긴 폴더 자체는 보여야 비밀번호를 넣을 자리가 있다) */
    private static boolean blockedByParent(Ctx ctx, DocFolderVO folder) {
        if (ctx.user.isAdmin() || folder.getParentId() == null) {
            return false;
        }
        DocFolderVO parent = ctx.byId.get(folder.getParentId());
        return parent != null && lockedGate(ctx, parent) != null;
    }

    /**
     * 그 폴더를 만질 수 없으면 막는다. write=true 는 넣거나 고치거나 지우는 일이다(공유받은 폴더에는 못 한다).
     * 잠겨 있으면 "'이름' 폴더는 비밀번호가 걸려 있어요".
     */
    private static DocFolderVO checkFolder(Ctx ctx, long folderId, boolean write) throws Exception {
        DocFolderVO folder = ctx.folder(folderId);
        if (!mayAccess(ctx.user, rootOf(ctx, folder))) {
            if (sharedRootOf(ctx, folder) == null) {
                throw new IllegalArgumentException(NO_RIGHT);
            }
            if (write) {
                throw new IllegalArgumentException("공유받은 폴더는 볼 수만 있어요");
            }
        }
        DocFolderVO gate = lockedGate(ctx, folder);
        if (gate != null) {
            throw new IllegalArgumentException("'" + gate.getName() + "' 폴더는 비밀번호가 걸려 있어요");
        }
        return folder;
    }

    // ===== 폴더 =====

    @Override
    public List<DocFolderVO> listFolders(String employeeId) throws Exception {
        Ctx ctx = new Ctx(employeeId);
        List<DocFolderVO> visible = new ArrayList<>();
        for (DocFolderVO f : ctx.byId.values()) {
            DocFolderVO root = rootOf(ctx, f);
            boolean mine = mayAccess(ctx.user, root);
            Long sharedFrom = sharedRootOf(ctx, f);
            if (!mine && sharedFrom == null) {
                continue;
            }
            // 잠긴 폴더 안에 무엇이 들어있는지는 안 보여준다. 하위폴더 이름만으로도 무슨 일을 하는지 드러난다
            if (blockedByParent(ctx, f)) {
                continue;
            }
            // 하위폴더에는 갈래가 안 적혀 있다. 화면이 탭을 가르려면 알아야 하므로 얹어준다
            f.setRootKind(root.getKind());
            f.setRootOwnerId(root.getOwnerId());
            f.setRootOwnerName(root.getOwnerName());
            f.setSharedRootId(sharedFrom);
            f.setSharedRoot(sharedFrom != null && sharedFrom.equals(f.getId()));
            f.setMine(mine);
            boolean locked = !isBlank(f.getLockHash());
            f.setLocked(locked);
            f.setUnlocked(ctx.user.isAdmin() || !locked || ctx.opened.contains(f.getId()));
            if (locked && !f.isUnlocked()) {
                // 잠긴 채로는 안에 몇 개가 들었는지도 알려주지 않는다
                f.setFileCount(null);
                f.setChildCount(null);
            }
            visible.add(f);
        }
        return visible;
    }

    @Override
    public long createFolder(String employeeId, DocFolderSaveVO request) throws Exception {
        Ctx ctx = new Ctx(employeeId);
        String name = trim(request.getName());
        if (name.isEmpty()) {
            throw new IllegalArgumentException("폴더명을 입력해주세요");
        }
        Long parentId = request.getParentId() == null || request.getParentId() == 0 ? null : request.getParentId();
        String kind = null;
        String department = null;
        String ownerId = null;
        if (parentId == null) {
            // 최상위 폴더에만 '누구 것인지' 를 적는다. 하위폴더는 위를 따른다
            kind = trim(request.getKind());
            if (!PUBLIC.equals(kind) && !PERSONAL.equals(kind)) {
                throw new IllegalArgumentException("공용문서함인지 개인문서함인지 골라주세요");
            }
            if (PERSONAL.equals(kind)) {
                ownerId = ctx.user.getId();
            } else {
                department = emptyToNull(trim(request.getDepartment()));
                // 남의 부서 공용함을 함부로 만들지 못하게 한다. 전사 공용도 마찬가지다. 관리자는 어느 부서든 만들 수 있다
                if (!ctx.user.isAdmin()) {
                    String mine = trim(ctx.user.getDepartment());
                    if (mine.isEmpty()) {
                        throw new IllegalArgumentException("부서가 정해져 있지 않아 공용문서함을 만들 수 없습니다. 관리자에게 부서 등록을 요청해주세요");
                    }
                    if (department != null && !department.equals(mine)) {
                        throw new IllegalArgumentException(mine + " 것만 만들 수 있습니다. 다른 부서 문서함은 관리자에게 요청해주세요");
                    }
                    department = mine;
                }
            }
        } else {
            if (!ctx.byId.containsKey(parentId)) {
                throw new IllegalArgumentException("상위 폴더를 찾을 수 없습니다");
            }
            checkFolder(ctx, parentId, true);
        }
        if (documentBoxDAO.countDuplicateName(name, parentId, null) > 0) {
            throw new IllegalArgumentException("같은 위치에 같은 이름의 폴더가 이미 있습니다");
        }
        return documentBoxDAO.insertFolder(parentId, name, kind, department, ownerId, nz(ctx.user.getId()), now()); // 2026-10-26 만든 사람 사번
    }

    @Override
    public void renameFolder(String employeeId, long folderId, String name) throws Exception {
        String n = trim(name);
        if (n.isEmpty()) {
            throw new IllegalArgumentException("폴더명을 입력해주세요");
        }
        Ctx ctx = new Ctx(employeeId);
        DocFolderVO folder = checkFolder(ctx, folderId, true);
        if (documentBoxDAO.countDuplicateName(n, folder.getParentId(), folderId) > 0) {
            throw new IllegalArgumentException("같은 위치에 같은 이름의 폴더가 이미 있습니다");
        }
        documentBoxDAO.updateFolderName(folderId, n);
    }

    // 안에 든 것까지 한 번에 지우면 실수로 부서 폴더를 통째로 날리는 사고가 난다
    @Override
    public void deleteFolder(String employeeId, long folderId) throws Exception {
        Ctx ctx = new Ctx(employeeId);
        DocFolderVO folder = checkFolder(ctx, folderId, true);
        int children = folder.getChildCount() == null ? 0 : folder.getChildCount();
        int files = folder.getFileCount() == null ? 0 : folder.getFileCount();
        if (children > 0 || files > 0) {
            List<String> parts = new ArrayList<>();
            if (children > 0) {
                parts.add("하위폴더 " + children + "개");
            }
            if (files > 0) {
                parts.add("파일 " + files + "개");
            }
            throw new IllegalArgumentException("안에 " + String.join(" · ", parts) + "가 들어있어 지울 수 없습니다");
        }
        documentBoxDAO.deleteFolder(folderId);
    }

    // ===== 잠금 =====

    // 이미 열려 있는 폴더에만 걸 수 있으므로(checkFolder), 남이 잠가둔 폴더를 몰래 다른 비밀번호로 바꿔치기할 수는 없다
    @Override
    public void setLock(String employeeId, long folderId, DocLockRequestVO request) throws Exception {
        String password = trim(request == null ? null : request.getPassword());
        if (password.length() < 4) {
            throw new IllegalArgumentException("비밀번호는 4자 이상으로 정해주세요");
        }
        Ctx ctx = new Ctx(employeeId);
        DocFolderVO folder = checkFolder(ctx, folderId, true);
        if (!isBlank(folder.getLockHash()) && !ctx.user.isAdmin()
                && !passwordVerifier.matches(trim(request.getCurrent()), folder.getLockHash())) {
            throw new IllegalArgumentException("지금 비밀번호가 맞지 않아요");
        }
        documentBoxDAO.updateLock(folderId, passwordVerifier.encode(password), nz(ctx.user.getId()), now()); // 2026-10-26 잠근 사람 사번
        // 방금 정한 사람은 다시 물어보지 않는다
        unlockStore.open(employeeId, folderId);
    }

    @Override
    public void clearLock(String employeeId, long folderId, String current) throws Exception {
        Ctx ctx = new Ctx(employeeId);
        DocFolderVO folder = ctx.folder(folderId);
        if (isBlank(folder.getLockHash())) {
            throw new IllegalArgumentException("이 폴더에는 비밀번호가 없어요");
        }
        checkFolder(ctx, folderId, true);
        if (!ctx.user.isAdmin() && !passwordVerifier.matches(trim(current), folder.getLockHash())) {
            throw new IllegalArgumentException("지금 비밀번호가 맞지 않아요");
        }
        documentBoxDAO.updateLock(folderId, null, null, null);
    }

    // 볼 자격이 없는 사람에게는 비밀번호를 맞춰볼 기회조차 주지 않는다. 공유받은 사람은 자격이 있다
    @Override
    public void unlock(String employeeId, long folderId, String password) throws Exception {
        Ctx ctx = new Ctx(employeeId);
        DocFolderVO folder = ctx.folder(folderId);
        if (!mayAccess(ctx.user, rootOf(ctx, folder)) && sharedRootOf(ctx, folder) == null) {
            throw new IllegalArgumentException(NO_RIGHT);
        }
        if (isBlank(folder.getLockHash())) {
            return; // 잠겨있지 않다
        }
        if (!passwordVerifier.matches(trim(password), folder.getLockHash())) {
            throw new IllegalArgumentException("비밀번호가 맞지 않아요");
        }
        unlockStore.open(employeeId, folderId);
    }

    // ===== 파일 =====

    @Override
    public List<DocFileVO> listFiles(String employeeId, long folderId) throws Exception {
        checkFolder(new Ctx(employeeId), folderId, false);
        String ref = String.valueOf(folderId);
        List<AttachmentVO> rows = attachmentService.listByRefs("document", Collections.singletonList(ref)).get(ref);
        // 누구에게 몇 명 보냈는지 같이 알려준다. 그래야 파일 줄에 '공유 (2)' 가 뜨고, 두 번 보내지 않는다
        Map<Long, Integer> shared = documentBoxDAO.selectShareCounts(folderId);
        List<DocFileVO> out = new ArrayList<>();
        if (rows != null) {
            for (AttachmentVO a : rows) {
                DocFileVO f = new DocFileVO();
                f.setId(a.getId());
                f.setOrigName(a.getOrigName());
                f.setSizeBytes(a.getSizeBytes());
                f.setUploadedBy(a.getUploadedBy());
                f.setCreatedAt(a.getCreatedAt());
                Integer count = shared.get(a.getId());
                f.setShareCount(count == null ? 0 : count);
                out.add(f);
            }
        }
        return out;
    }

    @Override
    public AttachmentUploadResultVO upload(String employeeId, long folderId, List<MultipartFile> files) throws Exception {
        Ctx ctx = new Ctx(employeeId);
        checkFolder(ctx, folderId, true);
        return attachmentService.uploadDocuments(folderId, files, nz(ctx.user.getId())); // 2026-10-26 올린 사람 사번
    }

    // 문서 하나가 나에게 공유돼 있으면 그것만으로 통과시킨다. 공유는 폴더 권한을 뚫는 유일한 구멍이라 여기 한 곳에만 둔다
    @Override
    public AttachmentVO findForDownload(String employeeId, long attachmentId) throws Exception {
        AttachmentVO row = attachmentService.findDocument(attachmentId);
        String today = today();
        for (String expires : documentBoxDAO.selectFileShareExpiry(attachmentId, employeeId)) {
            if (isLive(expires, today)) {
                return row;
            }
        }
        // 남의 부서 공용함이나 남의 개인함 문서를 번호만 바꿔가며 꺼내지 못하게 한다(폴더 공유는 checkFolder 가 본다)
        checkFolder(new Ctx(employeeId), folderIdOf(row), false);
        return row;
    }

    @Override
    public void deleteFile(String employeeId, long attachmentId) throws Exception {
        AttachmentVO row = attachmentService.findDocument(attachmentId);
        checkFolder(new Ctx(employeeId), folderIdOf(row), true);
        // 원본이 없어지면 공유도 같이 없어진다(공통 첨부가 함께 지운다)
        attachmentService.deleteDocument(attachmentId);
    }

    // ===== 공유 =====
    // 파일을 복사하지 않는다. '이 문서를 이 사람에게 보여준다' 한 줄을 남긴다. 원본이 바뀌면 받는 사람도 바뀐 것을 본다.

    @Override
    public DocShareResultVO share(String employeeId, DocShareRequestVO request) throws Exception {
        Long folderId = request.getFolderId() == null || request.getFolderId() == 0 ? null : request.getFolderId();
        Long attachmentId = null;
        if (folderId == null) {
            attachmentId = request.getAttachmentId();
            if (attachmentId == null) {
                throw new IllegalArgumentException("공유할 문서나 폴더를 골라주세요");
            }
        }
        Set<String> toIds = new TreeSet<>();
        if (request.getToEmployeeIds() != null) {
            for (String id : request.getToEmployeeIds()) {
                String t = trim(id);
                if (!t.isEmpty()) {
                    toIds.add(t);
                }
            }
        }
        if (toIds.isEmpty()) {
            throw new IllegalArgumentException("받을 사람을 골라주세요");
        }
        String note = emptyToNull(trim(request.getNote()));
        String expiresAt = emptyToNull(trim(request.getExpiresAt()));
        toIds.remove(employeeId);
        if (toIds.isEmpty()) {
            throw new IllegalArgumentException("나에게는 보낼 수 없어요");
        }

        Ctx ctx = new Ctx(employeeId);
        String origName;
        if (folderId != null) {
            // 내가 못 여는 폴더는 남에게 보낼 수도 없다. 받는 사람에게 비밀번호는 딸려가지 않는다
            origName = checkFolder(ctx, folderId, true).getName();
        } else {
            origName = myPersonalAttachment(ctx, attachmentId).getOrigName();
        }

        String now = now();
        DocShareResultVO result = new DocShareResultVO();
        result.setNoChat(new ArrayList<String>());
        for (String to : toIds) {
            String toName = documentBoxDAO.selectEmployeeName(to);
            if (toName == null) {
                continue;
            }
            DocShareRowVO row = new DocShareRowVO();
            row.setAttachmentId(attachmentId);
            row.setFolderId(folderId);
            row.setToEmployeeId(to);
            row.setSharedBy(employeeId);
            row.setSharedByName(nz(ctx.user.getName()));
            row.setNote(note);
            row.setExpiresAt(expiresAt);
            row.setCreatedAt(now);
            if (documentBoxDAO.insertShare(row) == 0) {
                // 이미 보낸 사람. 두 번 보내도 조용히 넘어간다
                result.setAlready(result.getAlready() + 1);
                continue;
            }
            result.setSent(result.getSent() + 1);
            // 메신저로 알린다. 송연은 메신저 권한이 없는 사람을 빼고 알렸지만 이 프로젝트는 권한 개념이 없어 모두에게 알린다
            long roomId = findOrCreateDm(employeeId, nz(ctx.user.getName()), to, toName, now);
            postMessage(roomId, employeeId, nz(ctx.user.getName()), shareText(origName, folderId != null, expiresAt, note), now);
        }
        return result;
    }

    /** 메신저 알림 글(송연 문구). 비밀번호는 적지 않는다 — 여기 적으면 잠가둔 뜻이 없어진다 */
    static String shareText(String origName, boolean folder, String expiresAt, String note) {
        String until = expiresAt != null ? " (" + expiresAt + "까지 볼 수 있어요)" : "";
        // 파일 이름 뒤에 조사를 붙이면 받침을 따져야 한다. '파일을' 로 받아 넘긴다
        String what = folder ? "폴더를" : "파일을";
        StringBuilder text = new StringBuilder("[문서 공유] '").append(origName).append("' ").append(what).append(" 보냈어요.").append(until)
                .append("\n문서함의 '공유문서함' 탭에서 볼 수 있어요.");
        if (folder) {
            text.append("\n(비밀번호가 걸려 있으면 따로 알려드릴게요)");
        }
        if (note != null) {
            text.append("\n— ").append(note);
        }
        return text.toString();
    }

    // 공용문서함 문서는 그 부서 사람이 이미 볼 수 있다. 개인문서함 것만, 내 것만 보낸다
    private AttachmentVO myPersonalAttachment(Ctx ctx, long attachmentId) throws Exception {
        AttachmentVO row;
        try {
            row = attachmentService.findDocument(attachmentId);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("문서를 찾을 수 없습니다");
        }
        DocFolderVO folder = ctx.byId.get(folderIdOf(row));
        if (folder == null) {
            throw new IllegalArgumentException(NOT_FOUND);
        }
        DocFolderVO root = rootOf(ctx, folder);
        if (!PERSONAL.equals(root.getKind())) {
            throw new IllegalArgumentException("공용문서함 문서는 공유하지 않아도 그 부서 사람이 이미 볼 수 있습니다. "
                    + "다른 부서에 보내야 한다면 개인문서함에 두고 공유해주세요");
        }
        if (!ctx.user.getId().equals(root.getOwnerId()) && !ctx.user.isAdmin()) {
            throw new IllegalArgumentException("내 개인문서함 문서만 공유할 수 있습니다");
        }
        return row;
    }

    /** 두 사람의 1:1 방(송연 chat.find_or_create_dm). 열쇠는 작은 번호_큰 번호라 누가 먼저 걸든 한 방에 모인다(사번은 글자로 견준다) */
    private long findOrCreateDm(String myId, String myName, String otherId, String otherName, String now) throws Exception {
        String dmKey = myId.compareTo(otherId) <= 0 ? myId + "_" + otherId : otherId + "_" + myId;
        Long existing = documentBoxDAO.selectDmRoom(dmKey);
        if (existing != null) {
            return existing;
        }
        int created = documentBoxDAO.insertDmRoom(dmKey, myId, now);
        long roomId = documentBoxDAO.selectDmRoom(dmKey);
        if (created > 0) {
            documentBoxDAO.insertRoomMember(roomId, myId, myName, now);
            documentBoxDAO.insertRoomMember(roomId, otherId, otherName, now);
        }
        return roomId;
    }

    // 보낸 사람 쪽은 읽은 것으로 표시한다. 안 그러면 보낸 사람 화면에 자기가 보낸 알림이 '안 읽은 1건' 으로 뜬다
    private void postMessage(long roomId, String senderId, String senderName, String content, String now) throws Exception {
        long messageId = documentBoxDAO.insertChatMessage(roomId, senderId, senderName, content, now);
        documentBoxDAO.updateLastRead(roomId, senderId, messageId);
    }

    @Override
    public List<DocPersonVO> people(String employeeId) throws Exception {
        return documentBoxDAO.selectPeople(employeeId);
    }

    @Override
    public List<String> departments() throws Exception {
        return documentBoxDAO.selectDepartments();
    }

    // 폴더로 온 것은 안에 무엇이 들었는지 여기서 세지 않는다 — 잠긴 폴더의 파일 수를 알려주면 잠가둔 뜻이 새어나간다
    @Override
    public List<DocShareVO> sharesToMe(String employeeId) throws Exception {
        Set<Long> opened = unlockStore.openedBy(employeeId);
        String today = today();
        List<DocShareVO> out = new ArrayList<>();
        for (DocShareVO s : documentBoxDAO.selectSharesToMeFiles(employeeId)) {
            if (isLive(s.getExpiresAt(), today)) {
                out.add(s);
            }
        }
        for (DocShareVO s : documentBoxDAO.selectSharesToMeFolders(employeeId)) {
            s.setUnlocked(s.getFolderId() != null && opened.contains(s.getFolderId()));
            if (isLive(s.getExpiresAt(), today)) {
                out.add(s);
            }
        }
        out.sort((a, b) -> nz(b.getCreatedAt()).compareTo(nz(a.getCreatedAt())));
        return out;
    }

    @Override
    public List<DocShareVO> sharesByMe(String employeeId) throws Exception {
        return documentBoxDAO.selectSharesByMe(employeeId);
    }

    @Override
    public void cancelShare(String employeeId, long shareId) throws Exception {
        String owner = documentBoxDAO.selectShareOwner(shareId);
        if (owner == null) {
            throw new IllegalArgumentException("공유를 찾을 수 없습니다");
        }
        if (!owner.equals(employeeId) && !me(employeeId).isAdmin()) {
            throw new IllegalArgumentException("내가 보낸 공유만 취소할 수 있습니다");
        }
        documentBoxDAO.deleteShare(shareId);
    }

    // ===== 작은 도움 =====

    /** 기한이 비어있으면 계속 살아있다. 적혀있으면 그 날까지 */
    static boolean isLive(String expiresAt, String today) {
        return isBlank(expiresAt) || expiresAt.compareTo(today) >= 0;
    }

    private static long folderIdOf(AttachmentVO row) {
        try {
            return Long.parseLong(row.getRefId());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(NOT_FOUND);
        }
    }

    private static String today() {
        return LocalDate.now(SEOUL).toString();
    }

    private static String now() {
        return LocalDateTime.now(SEOUL).format(ISO_SECONDS);
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
