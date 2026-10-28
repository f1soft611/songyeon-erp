import { useEffect, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import type { NoticeFeedItem } from '../types/community.types';

type PopupSettings = Pick<NoticeFeedItem, 'loginPopupYn' | 'popupEndDate'>;
const koreanDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function NoticeLoginPopupBadge({ loginPopupYn, popupEndDate }: PopupSettings) {
  return loginPopupYn === 'Y' ? <EnabledPopupBadge popupEndDate={popupEndDate} /> : null;
}

function EnabledPopupBadge({ popupEndDate }: Pick<PopupSettings, 'popupEndDate'>) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const current = Date.now();
      const nextMidnight = Date.parse(`${koreanDay.format(current)}T00:00:00+09:00`) + 86_400_000;
      timer = setTimeout(() => { setNow(Date.now()); schedule(); }, nextMidnight - current);
    };
    const refresh = () => { clearTimeout(timer); setNow(Date.now()); schedule(); };
    schedule();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const expired = Boolean(popupEndDate && popupEndDate < koreanDay.format(now));
  const label = expired ? '팝업 종료' : '로그인 팝업';
  const tooltip = popupEndDate
    ? `${expired ? '로그인 팝업 종료' : '로그인 시 표시'} · 종료일 ${popupEndDate}${expired ? '' : ' (당일까지)'}`
    : '로그인 팝업 종료일 정보가 없습니다.';

  return <Tooltip title={tooltip} describeChild>
    <Box component="span" role="img" aria-label={label}
      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 28, flexShrink: 0, color: expired ? 'text.disabled' : 'primary.main' }}>
      {expired ? <NotificationsOffOutlinedIcon fontSize="small" /> : <NotificationsActiveOutlinedIcon fontSize="small" />}
    </Box>
  </Tooltip>;
}
