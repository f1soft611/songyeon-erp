package egovframework.let.groupware.realtime;

import javax.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import egovframework.com.cmm.LoginVO;

@RestController
public class RealtimeApiController {

    private final RealtimeStreamService streams;

    public RealtimeApiController(RealtimeStreamService streams) {
        this.streams = streams;
    }

    @GetMapping(value = "/api/v1/groupware/realtime", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connect(@AuthenticationPrincipal LoginVO user, HttpServletResponse response) {
        SseEmitter emitter = streams.connect(user);
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Accel-Buffering", "no");
        return emitter;
    }
}
