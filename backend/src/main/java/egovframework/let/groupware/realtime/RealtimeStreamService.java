package egovframework.let.groupware.realtime;

import java.io.IOException;
import java.time.Clock;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.LongFunction;

import javax.annotation.PreDestroy;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import egovframework.com.cmm.LoginVO;

@Service
public class RealtimeStreamService {

    private static final long LIFETIME_MILLIS = 45000L;
    private static final long HEARTBEAT_MILLIS = 15000L;
    private static final int MAX_CONNECTIONS_PER_OWNER = 6;

    private final Map<Owner, Deque<Connection>> connections = new HashMap<>();
    private final Clock clock;
    private final LongFunction<SseEmitter> emitterFactory;

    public RealtimeStreamService() {
        this(Clock.systemUTC(), SseEmitter::new);
    }

    RealtimeStreamService(Clock clock, LongFunction<SseEmitter> emitterFactory) {
        this.clock = clock;
        this.emitterFactory = emitterFactory;
    }

    public SseEmitter connect(LoginVO principal) {
        Owner owner = owner(principal);
        Connection connection = new Connection(owner, emitterFactory.apply(LIFETIME_MILLIS), clock.millis());
        connection.emitter.onCompletion(() -> remove(connection));
        connection.emitter.onTimeout(() -> close(connection));
        connection.emitter.onError(error -> close(connection));
        Connection evicted = null;
        synchronized (connection) {
            synchronized (connections) {
                Deque<Connection> ownerConnections = connections.computeIfAbsent(owner, key -> new ArrayDeque<>());
                if (ownerConnections.size() >= MAX_CONNECTIONS_PER_OWNER) {
                    evicted = ownerConnections.removeFirst();
                }
                ownerConnections.addLast(connection);
            }
            send(connection, SseEmitter.event().name("ready").data(Collections.emptyMap()));
        }
        if (evicted != null) {
            close(evicted);
        }
        return connection.emitter;
    }

    void publish(Long tenantId, String userId, RealtimeArea area) {
        if (area == null) {
            return;
        }
        List<Connection> recipients;
        synchronized (connections) {
            Deque<Connection> ownerConnections = connections.get(new Owner(tenantId, userId));
            recipients = ownerConnections == null ? Collections.emptyList() : new ArrayList<>(ownerConnections);
        }
        for (Connection connection : recipients) {
            send(connection, SseEmitter.event().name("change")
                    .data(Collections.singletonMap("area", area.name())));
        }
    }

    @Scheduled(fixedDelay = 1000L)
    public void maintainConnections() {
        long now = clock.millis();
        for (Connection connection : snapshot()) {
            synchronized (connection) {
                if (now - connection.createdAt >= LIFETIME_MILLIS) {
                    close(connection);
                } else if (now - connection.lastHeartbeatAt >= HEARTBEAT_MILLIS) {
                    send(connection, SseEmitter.event().comment("heartbeat"));
                    connection.lastHeartbeatAt = now;
                }
            }
        }
    }

    @PreDestroy
    public void shutdown() {
        for (Connection connection : snapshot()) {
            close(connection);
        }
    }

    private List<Connection> snapshot() {
        synchronized (connections) {
            List<Connection> snapshot = new ArrayList<>();
            connections.values().forEach(snapshot::addAll);
            return snapshot;
        }
    }

    private void send(Connection connection, SseEmitter.SseEventBuilder event) {
        synchronized (connection) {
            if (connection.closed) {
                return;
            }
            if (clock.millis() - connection.createdAt >= LIFETIME_MILLIS) {
                close(connection);
                return;
            }
            try {
                connection.emitter.send(event);
            } catch (IOException | RuntimeException exception) {
                close(connection);
            }
        }
    }

    private void close(Connection connection) {
        synchronized (connection) {
            if (connection.closed) {
                return;
            }
            remove(connection);
            try {
                connection.emitter.complete();
            } catch (RuntimeException exception) {
                // A disconnected servlet response may already be completed.
            }
        }
    }

    private void remove(Connection connection) {
        synchronized (connection) {
            connection.closed = true;
            synchronized (connections) {
                Deque<Connection> ownerConnections = connections.get(connection.owner);
                if (ownerConnections != null) {
                    ownerConnections.remove(connection);
                    if (ownerConnections.isEmpty()) {
                        connections.remove(connection.owner);
                    }
                }
            }
        }
    }

    private static Owner owner(LoginVO user) {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0
                || !StringUtils.hasText(user.getUniqId())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        // 송연: uniqId 는 사번 문자열이다(앞 0 유지, 숫자로 바꾸지 않는다)
        return new Owner(user.getTenantId(), user.getUniqId().trim());
    }

    private static final class Owner {
        private final Long tenantId;
        private final String userId;

        private Owner(Long tenantId, String userId) {
            this.tenantId = tenantId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object other) {
            if (!(other instanceof Owner)) {
                return false;
            }
            Owner owner = (Owner) other;
            return Objects.equals(tenantId, owner.tenantId) && Objects.equals(userId, owner.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(tenantId, userId);
        }
    }

    private static final class Connection {
        private final Owner owner;
        private final SseEmitter emitter;
        private final long createdAt;
        private long lastHeartbeatAt;
        private boolean closed;

        private Connection(Owner owner, SseEmitter emitter, long createdAt) {
            this.owner = owner;
            this.emitter = emitter;
            this.createdAt = createdAt;
            this.lastHeartbeatAt = createdAt;
        }
    }
}
