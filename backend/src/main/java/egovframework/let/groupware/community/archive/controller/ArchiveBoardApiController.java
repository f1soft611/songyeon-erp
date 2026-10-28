package egovframework.let.groupware.community.archive.controller;

import java.util.HashMap;
import java.util.Map;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.common.dto.ListResult;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileItemVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileSearchVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileUpdateRequestVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostSaveRequestVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostSearchVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostVO;
import egovframework.let.groupware.community.archive.service.ArchiveBoardService;

@RestController
@RequestMapping("/api/v1/groupware/boards/archive")
public class ArchiveBoardApiController {
    private final ResultVoHelper resultVoHelper;
    private final ArchiveBoardService archiveBoardService;

    public ArchiveBoardApiController(ResultVoHelper resultVoHelper, ArchiveBoardService archiveBoardService) {
        this.resultVoHelper = resultVoHelper;
        this.archiveBoardService = archiveBoardService;
    }

    @GetMapping("/files")
    public ResultVO listFiles(@ModelAttribute ArchiveBoardFileSearchVO search,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        search.setTenantId(user.getTenantId());
        ListResult<ArchiveBoardFileItemVO> result = archiveBoardService.listFiles(search, user);
        Map<String, Object> values = new HashMap<>();
        values.put("resultList", result.getResultList());
        values.put("resultCnt", result.getResultCnt());
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/posts")
    public ResultVO listPosts(@ModelAttribute ArchiveBoardPostSearchVO search,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        search.setTenantId(user.getTenantId());
        ListResult<ArchiveBoardPostVO> result = archiveBoardService.listPosts(search, user);
        Map<String, Object> values = new HashMap<>();
        values.put("resultList", result.getResultList());
        values.put("resultCnt", result.getResultCnt());
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    @GetMapping("/posts/{postId}")
    public ResultVO getPost(@PathVariable Long postId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return item(archiveBoardService.getPost(postId, user));
    }

    @PostMapping("/files")
    public ResponseEntity<ResultVO> uploadFile(@RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String folderCode,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(item(archiveBoardService.uploadFile(file, folderCode, user)));
    }

    @PutMapping("/files/{boardFileId}")
    public ResponseEntity<ResultVO> updateFile(@PathVariable Long boardFileId,
            @RequestBody ArchiveBoardFileUpdateRequestVO payload,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return ResponseEntity.ok(item(archiveBoardService.updateFile(boardFileId, payload, user)));
    }

    @PutMapping("/posts/{postId}")
    public ResponseEntity<ResultVO> updatePost(@PathVariable Long postId,
            @RequestBody ArchiveBoardPostSaveRequestVO payload, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return ResponseEntity.ok(item(archiveBoardService.updatePost(postId, payload, user)));
    }

    @DeleteMapping("/posts/{postId}")
    public ResultVO deletePost(@PathVariable Long postId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        archiveBoardService.deletePost(postId, user);
        return message("자료가 삭제되었습니다.");
    }

    @PostMapping("/posts/{postId}/attachments")
    public ResponseEntity<ResultVO> uploadAttachment(@PathVariable Long postId,
            @RequestParam("file") MultipartFile file, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(item(archiveBoardService.uploadAttachment(postId, file, user)));
    }

    @DeleteMapping("/attachments/{boardFileId}")
    public ResultVO deleteAttachment(@PathVariable Long boardFileId, @RequestParam Long postId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        archiveBoardService.deleteAttachment(postId, boardFileId, user);
        return message("첨부파일이 삭제되었습니다.");
    }

    @GetMapping("/attachments/{boardFileId}/download")
    public void downloadAttachment(@PathVariable Long boardFileId, @RequestParam Long postId,
            HttpServletResponse response, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        archiveBoardService.downloadAttachment(postId, boardFileId, response, user);
    }

    private ResultVO item(Object value) {
        Map<String, Object> values = new HashMap<>();
        values.put("item", value);
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private ResultVO message(String message) {
        Map<String, Object> values = new HashMap<>();
        values.put("message", message);
        return resultVoHelper.buildFromMap(values, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 없습니다.");
        }
    }
}
