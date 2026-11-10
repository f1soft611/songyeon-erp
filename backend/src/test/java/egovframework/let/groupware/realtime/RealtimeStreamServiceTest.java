package egovframework.let.groupware.realtime;

import static org.assertj.core.api.Assertions.*;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import egovframework.com.cmm.LoginVO;

// S_ERP RealtimeStreamServiceTest(2026-11-02 알림 · 쪽지 실시간)와 같은 확인. 송연은 사람을 사번 문자열로 가리킨다(20261103_003)
class RealtimeStreamServiceTest {

    private final MutableClock clock = new MutableClock();
    private final List<RecordingEmitter> emitters = Collections.synchronizedList(new ArrayList<>());
    private final RealtimeStreamService streams = new RealtimeStreamService(clock, timeout -> {
        RecordingEmitter emitter = new RecordingEmitter(timeout);
        emitters.add(emitter);
        return emitter;
    });

    @Test
    void readyAndChangesContainOnlyMinimalDataAndIsolateOwners() {
        streams.connect(user(4L, "12"));
        streams.connect(user(4L, "13"));
        streams.connect(user(5L, "12"));

        assertThat(emitters.get(0).events.get(0)).contains("event:ready", "{}");
        streams.publish(4L, "12", RealtimeArea.MESSAGE);
        assertThat(emitters.get(0).events).hasSize(2);
        assertThat(emitters.get(0).events.get(1)).contains("event:change", "{area=MESSAGE}");
        assertThat(emitters.get(1).events).hasSize(1);
        assertThat(emitters.get(2).events).hasSize(1);
    }

    @Test
    void rejectsMissingOrInvalidPrincipalBeforeAllocatingConnections() {
        for (LoginVO user : new LoginVO[] {null, user(null, "12"), user(0L, "12"),
                user(4L, null), user(4L, " ")}) {
            assertThatThrownBy(() -> streams.connect(user)).isInstanceOf(ResponseStatusException.class)
                    .extracting(error -> ((ResponseStatusException) error).getRawStatusCode()).isEqualTo(401);
        }
        assertThat(emitters).isEmpty();
    }

    @Test
    void heartbeatAndNormalExpirationCompleteWithoutError() {
        streams.connect(user(4L, "12"));
        RecordingEmitter emitter = emitters.get(0);
        assertThat(emitter.getTimeout()).isEqualTo(45000L);
        clock.millis = 14999;
        streams.maintainConnections();
        assertThat(emitter.events).hasSize(1);
        clock.millis = 15000;
        streams.maintainConnections();
        assertThat(emitter.events.get(1)).contains(":heartbeat");
        clock.millis = 45000;
        streams.maintainConnections();
        assertThat(emitter.completed).isTrue();
        streams.publish(4L, "12", RealtimeArea.MESSAGE);
        assertThat(emitter.events).hasSize(2);
    }

    @Test
    void completionTimeoutErrorAndSendFailureRemoveConnections() {
        for (int i = 0; i < 4; i++) {
            streams.connect(user(4L, "12"));
        }
        emitters.get(0).completion.run();
        emitters.get(1).timeout.run();
        emitters.get(2).error.accept(new IOException("disconnected"));
        emitters.get(3).failSend = true;
        streams.publish(4L, "12", RealtimeArea.MESSAGE);
        emitters.get(3).failSend = false;
        streams.publish(4L, "12", RealtimeArea.MESSAGE);
        assertThat(emitters).allSatisfy(emitter -> assertThat(emitter.events).hasSize(1));
        assertThat(emitters.get(1).completed).isTrue();
    }

    @Test
    void oldestConnectionsAreEvictedWithoutRemovingNewConnectionsForOwner() {
        for (int i = 0; i < 7; i++) {
            streams.connect(user(4L, "12"));
        }
        assertThat(emitters.get(0).completed).isTrue();
        emitters.get(0).completion.run();
        streams.publish(4L, "12", RealtimeArea.NOTIFICATION);
        assertThat(emitters.get(0).events).hasSize(1);
        assertThat(emitters.subList(1, 7)).allSatisfy(emitter -> assertThat(emitter.events).hasSize(2));
    }

    @Test
    void failedReadyDoesNotLeaveARegisteredConnection() {
        RealtimeStreamService failing = new RealtimeStreamService(clock, timeout -> {
            RecordingEmitter emitter = new RecordingEmitter(timeout);
            emitter.failSend = true;
            emitters.add(emitter);
            return emitter;
        });
        failing.connect(user(4L, "12"));
        emitters.get(0).failSend = false;
        failing.publish(4L, "12", RealtimeArea.MESSAGE);
        assertThat(emitters.get(0).events).isEmpty();
    }

    @Test
    void failingConnectionDoesNotPreventDeliveryToOtherConnections() {
        streams.connect(user(4L, "12"));
        streams.connect(user(4L, "12"));
        emitters.get(0).failSend = true;
        streams.publish(4L, "12", RealtimeArea.MESSAGE);
        assertThat(emitters.get(1).events).hasSize(2);
    }

    @Test
    void concurrentSubscriptionsRemainBoundedAndDelayedCallbacksPreserveNewConnections() throws Exception {
        ExecutorService workers = Executors.newFixedThreadPool(4);
        try {
            List<Callable<Void>> subscriptions = new ArrayList<>();
            for (int i = 0; i < 40; i++) {
                subscriptions.add(() -> {
                    streams.connect(user(4L, "12"));
                    return null;
                });
            }
            for (Future<Void> result : workers.invokeAll(subscriptions, 5, TimeUnit.SECONDS)) {
                result.get();
            }
            assertThat(emitters.stream().filter(emitter -> emitter.completed).count()).isEqualTo(34);
            emitters.stream().filter(emitter -> emitter.completed).forEach(emitter -> emitter.completion.run());
            streams.publish(4L, "12", RealtimeArea.MESSAGE);
            assertThat(emitters.stream().filter(emitter -> !emitter.completed).count()).isEqualTo(6);
            emitters.stream().filter(emitter -> !emitter.completed)
                    .forEach(emitter -> assertThat(emitter.events).hasSize(2));
        } finally {
            workers.shutdownNow();
        }
    }

    static LoginVO user(Long tenant, String userId) {
        LoginVO user = new LoginVO();
        user.setTenantId(tenant);
        user.setUniqId(userId);
        return user;
    }

    private static class MutableClock extends Clock {
        private long millis;
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return Instant.ofEpochMilli(millis); }
    }

    private static class RecordingEmitter extends SseEmitter {
        private final List<String> events = new ArrayList<>();
        private Runnable completion;
        private Runnable timeout;
        private Consumer<Throwable> error;
        private boolean failSend;
        private boolean completed;

        RecordingEmitter(Long timeout) { super(timeout); }
        @Override public void send(SseEventBuilder event) throws IOException {
            if (failSend) {
                throw new IOException("disconnected");
            }
            StringBuilder output = new StringBuilder();
            event.build().forEach(data -> output.append(data.getData()));
            events.add(output.toString());
        }
        @Override public void complete() { completed = true; }
        @Override public void onCompletion(Runnable callback) { completion = callback; }
        @Override public void onTimeout(Runnable callback) { timeout = callback; }
        @Override public void onError(Consumer<Throwable> callback) { error = callback; }
    }
}
