package egovframework.let.pu.documents.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.let.uat.uia.service.impl.LoginEmployeeResolver;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.pu.documents.domain.model.DocFolderSaveVO;
import egovframework.let.pu.documents.domain.model.DocLockRequestVO;
import egovframework.let.pu.documents.domain.model.DocShareRequestVO;
import egovframework.let.pu.documents.service.DocumentBoxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 구매관리 > 문서함 컨트롤러 클래스 (송연 /api/doc-folders · /api/attachments(document) · /api/document-shares · /api/departments 를 S_ERP 규칙으로 옮김)
 * 누가 무엇을 볼 수 있는지는 서비스가 로그인한 사원 번호로 가린다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pu/documents")
@Tag(name = "DocumentBoxApiController", description = "구매관리 - 문서함")
public class DocumentBoxApiController {

    private static final String TAG = "DocumentBoxApiController";

    private final ResultVoHelper resultVoHelper;
    private final DocumentBoxService documentBoxService;
    private final AttachmentService attachmentService;
    private final LoginEmployeeResolver loginEmployeeResolver;

    /** 할 일 하나(결과를 resultMap 에 담는다). 막히면(IllegalArgumentException) 송연 문구 그대로 900 으로 돌려준다 */
    private interface Work {
        void run(Map<String, Object> resultMap, String employeeId) throws Exception;
    }

    private ResultVO handle(LoginVO user, Work work) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            work.run(resultMap, employeeId(user));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    // 2026-10-22: 로그인 uniqId 가 tb_user 번호가 되어 사번은 도우미로 찾는다
    private String employeeId(LoginVO user) {
        String id = loginEmployeeResolver.employeeId(user);
        if (!StringUtils.hasText(id)) {
            throw new IllegalArgumentException("누구인지 알 수 없습니다. 다시 로그인해주세요");
        }
        return id;
    }

    @Operation(summary = "로그인한 사원 {id, name, department, admin}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/me")
    public ResultVO me(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("item", documentBoxService.me(me)));
    }

    @Operation(summary = "볼 수 있는 폴더 전부(부모 번호를 달아서)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/folders")
    public ResultVO folders(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("resultList", documentBoxService.listFolders(me)));
    }

    @Operation(summary = "새 폴더 {name, parentId, kind(공용·개인, 최상위만), department(공용 최상위만)} → {id}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/folders")
    public ResultVO createFolder(@RequestBody DocFolderSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("id", documentBoxService.createFolder(me, request)));
    }

    @Operation(summary = "폴더 이름 바꾸기 {name}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/folders/{id}")
    public ResultVO renameFolder(@PathVariable("id") long id, @RequestBody DocFolderSaveVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.renameFolder(me, id, request.getName()));
    }

    @Operation(summary = "폴더 지우기(비어있을 때만)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/folders/{id}")
    public ResultVO deleteFolder(@PathVariable("id") long id, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.deleteFolder(me, id));
    }

    @Operation(summary = "비밀번호 걸기·바꾸기 {password, current}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/folders/{id}/lock")
    public ResultVO setLock(@PathVariable("id") long id, @RequestBody DocLockRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.setLock(me, id, request));
    }

    @Operation(summary = "비밀번호 없애기 {current}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/folders/{id}/lock/remove")
    public ResultVO clearLock(@PathVariable("id") long id, @RequestBody(required = false) DocLockRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.clearLock(me, id, request == null ? null : request.getCurrent()));
    }

    @Operation(summary = "비밀번호로 열기 {password} (로그아웃할 때까지)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/folders/{id}/unlock")
    public ResultVO unlock(@PathVariable("id") long id, @RequestBody DocLockRequestVO request,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.unlock(me, id, request.getPassword()));
    }

    @Operation(summary = "폴더 안 파일", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/folders/{id}/files")
    public ResultVO files(@PathVariable("id") long id, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("resultList", documentBoxService.listFiles(me, id)));
    }

    @Operation(summary = "폴더에 파일 올리기(files) {saved, errors}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/folders/{id}/files")
    public ResultVO upload(@PathVariable("id") long id, @RequestParam(name = "files", required = false) List<MultipartFile> files,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("item", documentBoxService.upload(me, id, files)));
    }

    @Operation(summary = "파일 내려받기(올린 이름으로)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/files/{id}/download")
    public void download(@PathVariable("id") long id, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user,
            HttpServletResponse response) throws Exception {
        Path path;
        AttachmentVO row;
        try {
            row = documentBoxService.findForDownload(employeeId(user), id);
            path = attachmentService.pathOf(row);
            if (!Files.exists(path)) {
                throw new IllegalArgumentException("저장된 파일이 없습니다");
            }
        } catch (IllegalArgumentException ex) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write(ex.getMessage());
            return;
        }
        String encoded = URLEncoder.encode(row.getOrigName(), StandardCharsets.UTF_8.name()).replace("+", "%20");
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename=\"" + encoded + "\"; filename*=UTF-8''" + encoded);
        response.setContentLengthLong(Files.size(path));
        Files.copy(path, response.getOutputStream());
        response.flushBuffer();
    }

    @Operation(summary = "파일 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/files/{id}")
    public ResultVO deleteFile(@PathVariable("id") long id, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.deleteFile(me, id));
    }

    @Operation(summary = "공유 보내기 {attachmentId 또는 folderId, toEmployeeIds, note, expiresAt} → {sent, already, noChat}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/shares")
    public ResultVO share(@RequestBody DocShareRequestVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("item", documentBoxService.share(me, request)));
    }

    @Operation(summary = "공유받을 사람(나 빼고)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/shares/people")
    public ResultVO people(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("resultList", documentBoxService.people(me)));
    }

    @Operation(summary = "나에게 온 공유(기한 지난 것 빼고)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/shares/mine")
    public ResultVO sharesToMe(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("resultList", documentBoxService.sharesToMe(me)));
    }

    @Operation(summary = "내가 보낸 공유", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/shares/by-me")
    public ResultVO sharesByMe(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("resultList", documentBoxService.sharesByMe(me)));
    }

    @Operation(summary = "공유 취소(내가 보낸 것만)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/shares/{id}")
    public ResultVO cancelShare(@PathVariable("id") long id, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> documentBoxService.cancelShare(me, id));
    }

    @Operation(summary = "사원에게 적어둔 부서 이름들", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/departments")
    public ResultVO departments(@Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(user, (map, me) -> map.put("resultList", documentBoxService.departments()));
    }
}
