package egovframework.let.groupware.realtime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

// S_ERP RealtimeApiControllerTest(2026-11-02 알림 · 쪽지 실시간)와 같은 확인. 송연은 사람을 사번 문자열로 가리킨다(20261103_003)
class RealtimeApiControllerTest {

    private final RealtimeStreamService streams = new RealtimeStreamService();
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(
            new RealtimeApiController(streams))
            .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver()).build();

    @AfterEach
    void clearAuthentication() {
        streams.shutdown();
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsAuthenticatedStreamWithReadyAndNoBufferHeaders() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(RealtimeStreamServiceTest.user(4L, "12"), null));
        mvc.perform(get("/api/v1/groupware/realtime").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isOk()).andExpect(request().asyncStarted())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_EVENT_STREAM))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("X-Accel-Buffering", "no"))
                .andExpect(content().string("event:ready\ndata:{}\n\n"));
    }

    @Test
    void cannotSupplyAnOwnerInsteadOfAuthenticatedPrincipal() throws Exception {
        mvc.perform(get("/api/v1/groupware/realtime").param("tenantId", "4").param("userId", "12"))
                .andExpect(status().isUnauthorized()).andExpect(request().asyncNotStarted());
    }

    @Test
    void queryParametersCannotChangeOwnerAndChangePayloadContainsOnlyArea() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(RealtimeStreamServiceTest.user(4L, "12"), null));
        org.springframework.test.web.servlet.MvcResult result = mvc.perform(get("/api/v1/groupware/realtime")
                .param("tenantId", "5").param("userId", "13"))
                .andExpect(status().isOk()).andReturn();
        streams.publish(5L, "13", RealtimeArea.MESSAGE);
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getContentAsString())
                .isEqualTo("event:ready\ndata:{}\n\n");
        streams.publish(4L, "12", RealtimeArea.NOTIFICATION);
        org.assertj.core.api.Assertions.assertThat(result.getResponse().getContentAsString())
                .isEqualTo("event:ready\ndata:{}\n\nevent:change\ndata:{\"area\":\"NOTIFICATION\"}\n\n");
    }
}
