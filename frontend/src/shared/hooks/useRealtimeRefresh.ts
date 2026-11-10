import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RealtimeArea } from '../services/realtimeService';

export function useRealtimeRefresh(area: RealtimeArea, refresh: () => Promise<unknown>) {
  const refreshRef = useRef(refresh);
  useLayoutEffect(() => { refreshRef.current = refresh; });
  useEffect(() => {
    let active = true;
    let running = false;
    let pending = false;
    const run = async () => {
      if (running) { pending = true; return; }
      running = true;
      do {
        pending = false;
        try { await refreshRef.current(); } catch { /* Keep the last successful UI on background failures. */ }
      } while (active && pending);
      running = false;
    };
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ areas?: RealtimeArea[] }>).detail;
      if (detail?.areas?.includes(area)) void run();
    };
    window.addEventListener('songyeon-erp:realtime', receive);
    return () => {
      active = false;
      window.removeEventListener('songyeon-erp:realtime', receive);
    };
  }, [area]);
}
