package egovframework.let.groupware.message.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.groupware.message.domain.model.DirectMessageCreateRequestVO;
import egovframework.let.groupware.message.domain.model.DirectMessageDayPageVO;
import egovframework.let.groupware.message.domain.model.DirectMessagePageVO;
import egovframework.let.groupware.message.domain.model.DirectMessageReplyRequestVO;
import egovframework.let.groupware.message.service.DirectMessageService;

@RestController
@RequestMapping("/api/v1/groupware/messages")
public class DirectMessageApiController {

    private final ResultVoHelper resultVoHelper;
    private final DirectMessageService messageService;

    public DirectMessageApiController(ResultVoHelper resultVoHelper, DirectMessageService messageService) {
        this.resultVoHelper = resultVoHelper;
        this.messageService = messageService;
    }

    @GetMapping("/summary")
    public ResultVO summary(@AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("unreadCount", messageService.unreadCount(user));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @GetMapping("/{messageId}/thread")
    public ResultVO resolveNotificationSource(@PathVariable Long messageId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("threadId", messageService.resolveThreadIdForNotification(user, messageId));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @GetMapping("/threads")
    public ResultVO listThreads(@RequestParam(required = false) String folder,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) LocalDateTime beforeUpdatedAt,
            @RequestParam(required = false) Long beforeThreadId,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DirectMessagePageVO page = messageService.listThreads(user, folder, limit, beforeUpdatedAt, beforeThreadId);
        Map<String, Object> result = new HashMap<>();
        result.put("resultList", page.getResultList());
        result.put("hasNext", page.isHasNext());
        result.put("nextBeforeUpdatedAt", page.getNextBeforeUpdatedAt());
        result.put("nextBeforeThreadId", page.getNextBeforeThreadId());
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @PostMapping("/threads")
    public ResponseEntity<ResultVO> createThread(@RequestBody DirectMessageCreateRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("item", messageService.createThread(user, request));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS));
    }

    @GetMapping("/threads/{threadId}")
    public ResultVO getThread(@PathVariable Long threadId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate beforeDate,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        DirectMessageDayPageVO page = messageService.getThread(user, threadId, beforeDate);
        Map<String, Object> result = new HashMap<>();
        result.put("resultList", page.getResultList());
        result.put("messageDate", page.getMessageDate());
        result.put("hasPrevious", page.isHasPrevious());
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @DeleteMapping("/threads/{threadId}")
    public ResultVO hideThread(@PathVariable Long threadId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        messageService.hideThread(user, threadId);
        return resultVoHelper.buildFromMap(new HashMap<>(), ResponseCode.SUCCESS);
    }

    @PostMapping("/threads/{threadId}/read")
    public ResultVO markThreadRead(@PathVariable Long threadId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        messageService.markThreadRead(user, threadId);
        return resultVoHelper.buildFromMap(new HashMap<>(), ResponseCode.SUCCESS);
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<ResultVO> reply(@PathVariable Long threadId,
            @RequestBody DirectMessageReplyRequestVO request, @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("item", messageService.reply(user, threadId, request.getContent()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS));
    }
}
