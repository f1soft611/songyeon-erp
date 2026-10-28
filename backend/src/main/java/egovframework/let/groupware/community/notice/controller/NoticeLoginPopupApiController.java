package egovframework.let.groupware.community.notice.controller;

import java.util.HashMap;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.util.StringUtils;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.community.notice.service.NoticeLoginPopupService;

@RestController
@RequestMapping("/api/v1/groupware/boards/notice/login-popups")
public class NoticeLoginPopupApiController {
    private final NoticeLoginPopupService service;
    private final ResultVoHelper resultVoHelper;

    public NoticeLoginPopupApiController(NoticeLoginPopupService service, ResultVoHelper resultVoHelper) {
        this.service = service;
        this.resultVoHelper = resultVoHelper;
    }

    @GetMapping
    public ResultVO list(@AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> result = new HashMap<>();
        result.put("resultList", service.list(user.getTenantId(), user.getId()));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @GetMapping("/{postId}")
    public ResultVO detail(@PathVariable Long postId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        HashMap<String, Object> result = new HashMap<>();
        result.put("item", service.detail(user.getTenantId(), postId, user.getId()));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @PutMapping("/{postId}/dismiss-today")
    public ResultVO dismiss(@PathVariable Long postId, @AuthenticationPrincipal LoginVO user) throws Exception {
        requireAuthenticated(user);
        service.dismissToday(user.getTenantId(), postId, user.getId());
        HashMap<String, Object> result = new HashMap<>();
        result.put("message", "오늘 하루 이 공지를 표시하지 않습니다.");
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    private void requireAuthenticated(LoginVO user) {
        if (user == null || user.getTenantId() == null || !StringUtils.hasText(user.getId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }
}
