import { apiGetEventStream } from './apiClient';
import { getStoredAuth, subscribeAuthChange } from './authService';

export type RealtimeArea = 'NOTIFICATION' | 'MESSAGE';
const allAreas: RealtimeArea[] = ['NOTIFICATION', 'MESSAGE'];

export function startRealtimeUpdates(onChange: (areas: RealtimeArea[]) => void): () => void {
  let disposed = false;
  let session = '';
  let generation = 0;
  let request: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let batchTimer: ReturnType<typeof setTimeout> | undefined;
  let syncTimer: ReturnType<typeof setInterval> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const pending = new Set<RealtimeArea>();

  const queue = (areas: RealtimeArea[]) => {
    if (disposed || !session || document.visibilityState === 'hidden') return;
    areas.forEach((area) => pending.add(area));
    if (batchTimer !== undefined) return;
    batchTimer = setTimeout(() => {
      batchTimer = undefined;
      const areas = [...pending];
      pending.clear();
      if (!disposed && session && document.visibilityState !== 'hidden') onChange(areas);
    }, 250);
  };

  const stopConnection = () => {
    generation += 1;
    request?.abort();
    request = null;
    clearTimeout(retryTimer);
    clearTimeout(batchTimer);
    clearTimeout(watchdog);
    clearInterval(syncTimer);
    retryTimer = batchTimer = watchdog = undefined;
    syncTimer = undefined;
    pending.clear();
  };

  const connect = async () => {
    const current = generation;
    const abort = new AbortController();
    request = abort;
    const resetWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => abort.abort(), 60000);
    };
    resetWatchdog();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const cancelReader = () => { void reader?.cancel().catch(() => undefined); };
    try {
      const response = await apiGetEventStream('/api/v1/groupware/realtime', abort.signal);
      if (current !== generation || abort.signal.aborted) return;
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new Error('Invalid realtime stream');
      }
      reader = response.body.getReader();
      abort.signal.addEventListener('abort', cancelReader, { once: true });
      const decoder = new TextDecoder();
      const connectedAt = Date.now();
      let buffer = '';
      let event = '';
      let data: string[] = [];
      let frameSize = 0;
      const frame = () => {
        if (event === 'ready') {
          queue(allAreas);
        } else if (event === 'change') {
          try {
            const value: unknown = JSON.parse(data.join('\n'));
            if (value && typeof value === 'object' && 'area' in value
              && allAreas.includes(value.area as RealtimeArea)) {
              queue([value.area as RealtimeArea]);
            }
          } catch { /* Ignore incomplete or unsupported event data. */ }
        }
        event = '';
        data = [];
        frameSize = 0;
      };
      while (current === generation && !abort.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done || current !== generation || abort.signal.aborted) break;
        resetWatchdog();
        if (Date.now() - connectedAt >= 10000) failures = 0;
        buffer += decoder.decode(chunk.value, { stream: true });
        if (buffer.length > 65536) throw new Error('Oversized realtime frame');
        let newline: number;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newline).replace(/\r$/, '');
          buffer = buffer.slice(newline + 1);
          frameSize += line.length;
          if (frameSize > 65536) throw new Error('Oversized realtime frame');
          if (!line) frame();
          else if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        }
      }
    } catch {
      // Periodic REST reconciliation remains active while the stream reconnects.
    } finally {
      abort.signal.removeEventListener('abort', cancelReader);
      if (reader) {
        void reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      if (current === generation && !disposed) {
        clearTimeout(watchdog);
        retryTimer = setTimeout(() => { void connect(); }, Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)));
      }
    }
  };

  const synchronize = () => {
    if (disposed) return;
    const auth = getStoredAuth();
    const nextSession = auth ? JSON.stringify([auth.tenantCode, auth.userId, auth.popupSessionId]) : '';
    const visible = document.visibilityState !== 'hidden';
    if (nextSession === session && ((visible && request && !request.signal.aborted) || (!visible && !request))) return;
    stopConnection();
    session = nextSession;
    failures = 0;
    if (!session || !visible) return;
    queue(allAreas);
    syncTimer = setInterval(() => queue(allAreas), 30000);
    void connect();
  };

  const unsubscribe = subscribeAuthChange(synchronize);
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'songyeon-erp-auth' || event.key === null) synchronize();
  };
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', synchronize);
  synchronize();
  return () => {
    disposed = true;
    stopConnection();
    unsubscribe();
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', synchronize);
  };
}
