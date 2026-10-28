package egovframework.let.groupware.community.notice.controller;

import java.util.HashMap;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardFileVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSaveRequestVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostSearchVO;
import egovframework.let.groupware.community.notice.domain.model.NoticeBoardPostVO;
import egovframework.let.common.dto.ListResult;
import egovframework.let.groupware.community.notice.domain.model.NoticeEmbeddedImageVO;
import egovframework.let.groupware.community.notice.service.NoticeEmbeddedImageService;
import egovframework.let.groupware.community.notice.service.NoticeBoardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Generated;

@RestController
@RequestMapping("/api/v1/groupware/boards/notice")
@Tag(name = "NoticeBoardApiController", description = "공지사항 API")
public class NoticeBoardApiController {

    private final ResultVoHelper resultVoHelper;
    private final NoticeBoardService noticeBoardService;
    private final NoticeEmbeddedImageService noticeEmbeddedImageService;

    @Operation(summary = "공지 목록 조회", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "조회 성공"),
        @ApiResponse(responseCode = "401", description = "인증 필요")
    })
    @GetMapping("/posts")
    public ResultVO listPosts(
            @ModelAttribute NoticeBoardPostSearchVO search,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        search.setTenantId(user.getTenantId());
        HashMap<String, Object> resultMap = new HashMap<>();
        ListResult<NoticeBoardPostVO> result = noticeBoardService.listPosts(search);
        resultMap.put("resultList", result.getResultList());
        resultMap.put("resultCnt", result.getResultCnt());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공지 상세 조회", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "조회 성공"),
        @ApiResponse(responseCode = "404", description = "게시글 없음")
    })
    @GetMapping("/posts/{postId}")
    public ResultVO getPost(@PathVariable Long postId, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", noticeBoardService.getPost(user.getTenantId(), postId, user.getId()));
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공지 등록", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "등록 성공"),
        @ApiResponse(responseCode = "400", description = "입력값 오류")
    })
    @PostMapping("/posts")
    public ResponseEntity<ResultVO> createPost(@RequestBody NoticeBoardPostSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        NoticeBoardPostVO created = noticeBoardService.createPost(user.getTenantId(), payload, user.getId(), user.getName());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", created);
        resultMap.put("message", "공지사항이 등록되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공지 수정", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "수정 성공"),
        @ApiResponse(responseCode = "404", description = "게시글 없음")
    })
    @PutMapping("/posts/{postId}")
    public ResponseEntity<ResultVO> updatePost(@PathVariable Long postId,
            @RequestBody NoticeBoardPostSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        NoticeBoardPostVO updated = noticeBoardService.updatePost(user.getTenantId(), postId, payload, user.getId(), user.getName());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", updated);
        resultMap.put("message", "공지사항이 수정되었습니다.");
        return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공지 상단 고정 상태 변경", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @PutMapping("/posts/{postId}/pin")
    public ResponseEntity<ResultVO> updatePinned(@PathVariable Long postId,
            @RequestBody NoticeBoardPostSaveRequestVO payload,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        noticeBoardService.updatePinned(
            user.getTenantId(), postId, payload == null ? null : payload.getIsPinned(),
            user.getId(), user.getName());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "공지 상단 고정 상태가 변경되었습니다.");
        return ResponseEntity.ok(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공지 삭제", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "삭제 성공"),
        @ApiResponse(responseCode = "404", description = "게시글 없음")
    })
    @DeleteMapping("/posts/{postId}")
    public ResultVO deletePost(@PathVariable Long postId, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        noticeBoardService.deletePost(user.getTenantId(), postId, user.getId(), user.getName());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "공지사항이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "첨부파일 업로드", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "업로드 성공"),
        @ApiResponse(responseCode = "400", description = "파일 비어있음")
    })
    @PostMapping("/posts/{postId}/attachments")
    public ResponseEntity<ResultVO> uploadAttachment(@PathVariable Long postId,
            @RequestParam("file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "업로드할 파일이 없습니다.");
        }
        NoticeBoardFileVO attachment = noticeBoardService.uploadAttachment(user.getTenantId(), postId, file, user.getId());
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", attachment);
        resultMap.put("message", "첨부파일이 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공지 본문 이미지 임시 업로드", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "업로드 성공"),
        @ApiResponse(responseCode = "400", description = "이미지 파일 오류")
    })
    @PostMapping("/embedded-images/temp")
    public ResponseEntity<ResultVO> uploadTemporaryEmbeddedImage(
            @RequestParam("file") MultipartFile file,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        NoticeEmbeddedImageVO image = noticeEmbeddedImageService.uploadTemporaryImage(
            user.getTenantId(), user.getId(), file);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("item", image);
        resultMap.put("message", "본문 이미지가 업로드되었습니다.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS));
    }

    @Operation(summary = "공지 본문 임시 이미지 삭제", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @DeleteMapping("/embedded-images/temp/{uploadToken}")
    public ResultVO deleteTemporaryEmbeddedImage(
            @PathVariable String uploadToken,
            @RequestParam String fileName,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        noticeEmbeddedImageService.deleteTemporaryImage(user.getTenantId(), uploadToken, fileName);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "공지 임시 이미지가 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "첨부파일 삭제", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "삭제 성공"),
        @ApiResponse(responseCode = "404", description = "첨부파일 없음")
    })
    @DeleteMapping("/attachments/{boardFileId}")
    public ResultVO deleteAttachment(@PathVariable Long boardFileId,
            @RequestParam(required = false) Long postId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        noticeBoardService.deleteAttachment(user.getTenantId(), postId, boardFileId);
        HashMap<String, Object> resultMap = new HashMap<>();
        resultMap.put("message", "첨부파일이 삭제되었습니다.");
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }

    @Operation(summary = "첨부파일 다운로드", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @GetMapping("/attachments/{boardFileId}/download")
    public void downloadAttachment(@PathVariable Long boardFileId,
            @RequestParam(required = false) Long postId,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user,
            HttpServletResponse response) throws Exception {
        requireAuthenticated(user);
        noticeBoardService.downloadAttachment(user.getTenantId(), postId, boardFileId, response);
    }

    @Operation(summary = "공지 본문 이미지 조회", security = @SecurityRequirement(name = "Authorization"), tags = {"NoticeBoardApiController"})
    @GetMapping("/posts/{postId}/embedded-images")
    public void streamEmbeddedImage(@PathVariable Long postId,
            @RequestParam String objectKey,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user,
            HttpServletResponse response) throws Exception {
        requireAuthenticated(user);
        noticeBoardService.streamEmbeddedImage(user.getTenantId(), postId, objectKey, response);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    @Generated
    public NoticeBoardApiController(ResultVoHelper resultVoHelper, NoticeBoardService noticeBoardService,
            NoticeEmbeddedImageService noticeEmbeddedImageService) {
        this.resultVoHelper = resultVoHelper;
        this.noticeBoardService = noticeBoardService;
        this.noticeEmbeddedImageService = noticeEmbeddedImageService;
    }
}
