package egovframework.let.groupware.community.notice.controller;

import java.util.Collections;
import java.util.HashMap;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.community.notice.service.NoticeShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/v1/groupware/boards/notice")
public class NoticeShareApiController {
    private final NoticeShareService sharing;
    private final ResultVoHelper results;

    public NoticeShareApiController(NoticeShareService sharing, ResultVoHelper results) {
        this.sharing = sharing;
        this.results = results;
    }

    @Operation(summary = "공지 공유 링크 발급", security = @SecurityRequirement(name = "Authorization"))
    @PostMapping("/posts/{postId}/share-link")
    public ResultVO issue(@PathVariable Long postId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> result = new HashMap<>();
        result.put("item", Collections.singletonMap("token", sharing.issue(user, postId)));
        return results.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @Operation(summary = "공유 공지 미리보기", security = @SecurityRequirement(name = "Authorization"))
    @GetMapping("/shared-post")
    public ResultVO resolve(@RequestParam String token, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> result = new HashMap<>();
        result.put("item", sharing.resolve(user, token));
        return results.buildFromMap(result, ResponseCode.SUCCESS);
    }

    private static void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }
}
