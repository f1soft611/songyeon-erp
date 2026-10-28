package egovframework.let.uat.uia.service.impl;

import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * 로그인 시도 제한 (IP 기준)
 * - 실패 5회 → 1분, 10회 → 5분, 20회 → 30분 잠금. 성공하면 초기화한다.
 * - 송연 변환본(kr.co.songyeon.mes.auth.LoginAttemptLimiter)과 같은 규칙이다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Component("loginAttemptLimiter")
public class LoginAttemptLimiter {

	private static final int MAX_TRACKED = 10_000;
	private static final long FORGET_AFTER_MS = 15 * 60_000L;

	private final Clock clock;
	private final Map<String, Attempt> attempts = new HashMap<>();

	public LoginAttemptLimiter() {
		this(Clock.systemUTC());
	}

	LoginAttemptLimiter(Clock clock) {
		this.clock = clock;
	}

	private static final class Attempt {
		final int count;
		final long last;
		final long until;

		Attempt(int count, long last, long until) {
			this.count = count;
			this.last = last;
			this.until = until;
		}
	}

	private void expire() {
		long now = clock.millis();
		attempts.values().removeIf(a -> now >= a.until && now - a.last > FORGET_AFTER_MS);
	}

	/** 남은 잠금 시간(초). 0 이면 시도할 수 있다. */
	public synchronized int remaining(String ip) {
		expire();
		Attempt a = attempts.get(ip);
		if (a == null) {
			return attempts.size() >= MAX_TRACKED ? 60 : 0;
		}
		return (int) Math.max(0, (a.until - clock.millis() + 999) / 1000);
	}

	public synchronized void failed(String ip) {
		Attempt old = attempts.get(ip);
		int count = old == null ? 1 : old.count + 1;
		int seconds = count >= 20 ? 1800 : count >= 10 ? 300 : count >= 5 ? 60 : 0;
		if (old != null || attempts.size() < MAX_TRACKED) {
			attempts.put(ip, new Attempt(count, clock.millis(), clock.millis() + seconds * 1000L));
		}
	}

	public synchronized void succeeded(String ip) {
		attempts.remove(ip);
	}
}
