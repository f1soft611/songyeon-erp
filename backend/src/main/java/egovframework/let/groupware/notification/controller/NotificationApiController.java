package egovframework.let.groupware.notification.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.notification.domain.model.NotificationPageVO;
import egovframework.let.groupware.notification.service.NotificationService;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;

@RestController
@RequestMapping("/api/v1/groupware/notifications")
public class NotificationApiController {

    private final ResultVoHelper resultVoHelper;
    private final NotificationService notificationService;

    public NotificationApiController(ResultVoHelper resultVoHelper, NotificationService notificationService) {
        this.resultVoHelper = resultVoHelper;
        this.notificationService = notificationService;
    }

    @GetMapping("/summary")
    public ResultVO summary(@AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("unreadCount", notificationService.unreadCount(user));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @GetMapping
    public ResultVO list(@RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long beforeNotificationId,
            @RequestParam(defaultValue = "false") Boolean unreadOnly,
            @RequestParam(required = false) String eventType,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        NotificationPageVO page = notificationService.list(
                user, limit, beforeNotificationId, unreadOnly, eventType);
        result.put("resultList", page.getResultList());
        result.put("hasNext", page.isHasNext());
        result.put("nextBeforeNotificationId", page.getNextBeforeNotificationId());
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @PutMapping("/{notificationId}/archive")
    public ResultVO archive(@PathVariable Long notificationId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        notificationService.archiveNotification(user, notificationId);
        Map<String, Object> result = new HashMap<>();
        result.put("archived", true);
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @PutMapping("/archive-read")
    public ResultVO archiveRead(@RequestParam(required = false) String eventType,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("archivedCount", notificationService.archiveReadNotifications(user, eventType));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }

    @PutMapping("/{notificationId}/read")
    public ResultVO markRead(@PathVariable Long notificationId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        Map<String, Object> result = new HashMap<>();
        result.put("item", notificationService.markRead(user, notificationId));
        return resultVoHelper.buildFromMap(result, ResponseCode.SUCCESS);
    }
}
