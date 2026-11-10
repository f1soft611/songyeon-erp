// 2026-11-04 S_ERP realtime-service 테스트. 송연 로그인 키 · 이벤트 이름(songyeon-erp)에 맞춤
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ apiGetEventStream: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => mocks);
import { startRealtimeUpdates } from '../src/shared/services/realtimeService';

function login(userId = 'test') {
  localStorage.setItem('songyeon-erp-auth', JSON.stringify({
    tenantCode: 'TEST', userId, accessToken: 'test-token', refreshToken: '',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  }));
}

describe('realtime transport', () => {
  let stop: () => void;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  beforeEach(() => {
    vi.useFakeTimers();
    login();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    mocks.apiGetEventStream.mockReset();
    mocks.apiGetEventStream.mockImplementation(async () => new Response(new ReadableStream({
      start(value) { controller = value; },
    }), { headers: { 'Content-Type': 'text/event-stream' } }));
  });
  afterEach(() => {
    stop?.();
    vi.useRealTimers();
  });

  it('parses chunked CRLF events and coalesces changes while ignoring invalid frames', async () => {
    const changed = vi.fn();
    stop = startRealtimeUpdates(changed);
    await vi.advanceTimersByTimeAsync(250);
    changed.mockClear();
    controller.enqueue(encoder.encode(': heartbeat\r\n\r\nevent: chan'));
    controller.enqueue(encoder.encode('ge\r\ndata: {"area":"MESSAGE"}\r\n\r\n'));
    controller.enqueue(encoder.encode('event: change\ndata: {"area":"NOTIFICATION"}\n\n'));
    controller.enqueue(encoder.encode('event: change\ndata: invalid\n\nevent: change\ndata: {"area":"OTHER"}\n\n'));
    await vi.advanceTimersByTimeAsync(250);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(new Set(changed.mock.calls[0][0])).toEqual(new Set(['MESSAGE', 'NOTIFICATION']));
  });

  it('reconnects after stream end and resynchronizes after ready and periodically', async () => {
    const changed = vi.fn();
    stop = startRealtimeUpdates(changed);
    await vi.advanceTimersByTimeAsync(250);
    changed.mockClear();
    controller.close();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.apiGetEventStream).toHaveBeenCalledTimes(2);
    controller.enqueue(encoder.encode('event: ready\ndata: {}\n\n'));
    await vi.advanceTimersByTimeAsync(250);
    expect(changed).toHaveBeenCalledWith(['NOTIFICATION', 'MESSAGE']);
    changed.mockClear();
    await vi.advanceTimersByTimeAsync(30000);
    expect(changed).toHaveBeenCalledWith(['NOTIFICATION', 'MESSAGE']);
  });

  it('aborts on hidden/logout and stops timers; resumes on visibility and account change', async () => {
    const changed = vi.fn();
    stop = startRealtimeUpdates(changed);
    await vi.advanceTimersByTimeAsync(250);
    const firstSignal = mocks.apiGetEventStream.mock.calls[0][1] as AbortSignal;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(firstSignal.aborted).toBe(true);
    const calls = changed.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60000);
    expect(changed).toHaveBeenCalledTimes(calls);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(250);
    expect(mocks.apiGetEventStream).toHaveBeenCalledTimes(2);
    login('other');
    window.dispatchEvent(new Event('songyeon-erp-auth-change'));
    await vi.advanceTimersByTimeAsync(250);
    expect(mocks.apiGetEventStream).toHaveBeenCalledTimes(3);
    localStorage.removeItem('songyeon-erp-auth');
    window.dispatchEvent(new Event('songyeon-erp-auth-change'));
    const lastSignal = mocks.apiGetEventStream.mock.calls[2][1] as AbortSignal;
    expect(lastSignal.aborted).toBe(true);
    stop();
    changed.mockClear();
    await vi.advanceTimersByTimeAsync(60000);
    expect(changed).not.toHaveBeenCalled();
  });

  it('keeps periodic reconciliation during connection failure without unbounded retry', async () => {
    mocks.apiGetEventStream.mockRejectedValue(new Error('offline'));
    const changed = vi.fn();
    stop = startRealtimeUpdates(changed);
    await vi.advanceTimersByTimeAsync(60250);
    expect(changed.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mocks.apiGetEventStream.mock.calls.length).toBeLessThan(12);
  });
});
