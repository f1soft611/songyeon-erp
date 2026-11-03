import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Box } from '@mui/material';

// 화면검수 패널 자리: 본문 오른쪽 칸. 패널이 열리면 본문 폭이 줄어 그리드가 가려지지 않는다.
// 검수자로 쓸 로그인 사용자 이름도 여기서 내려준다
type ScreenReviewDockValue = { slot: HTMLElement | null; reviewer: string };

const ScreenReviewDockContext = createContext<ScreenReviewDockValue>({ slot: null, reviewer: '' });

export const useScreenReviewDock = () => useContext(ScreenReviewDockContext);

export function ScreenReviewDock({ reviewer, children }: { reviewer: string; children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ slot, reviewer }), [slot, reviewer]);

  return (
    <ScreenReviewDockContext.Provider value={value}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
        <Box ref={setSlot} sx={{ flexShrink: 0, display: 'flex', minHeight: 0 }} />
      </Box>
    </ScreenReviewDockContext.Provider>
  );
}
