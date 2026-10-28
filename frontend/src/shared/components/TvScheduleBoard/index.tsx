import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { todayDash } from '../../utils/excelFile';
import './TvScheduleBoard.css';

// 현장 TV 화면(송연 TvScheduleBoard, 기존 templates/tv_production.html · tv_logistics.html).
// 생산·물류 두 화면은 색과 문구만 다르고 움직임이 같아 한 부품으로 쓴다.
// 작업장 TV 에 띄워두는 화면이라 어제·오늘·내일 세 칸을 나란히 두고 3초마다 다시 받는다. 가운데(오늘) 칸에서만 날짜를 바꾼다.
// 로그인 없이 열리는 공개 화면이라 앱 테마(MUI)와 상관없이 늘 어두운 바탕이다.
const REFRESH_MS = 3000;
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// TV 에 보이는 한 줄(거래처·품목명·수량·비고)
export type TvRow = { clientName?: string | null; productName?: string | null; orderQty?: string | null; note?: string | null };

// 송연 parseQtyNumber: '1,000kg' → 1000
const parseQty = (value: string) => {
  const match = String(value || '').replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) || 0 : 0;
};
export const shiftDate = (dateStr: string, days: number) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return todayDash(date);
};
export const tvDateTitle = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAYS[date.getDay()]})`;
};
export const tvTotal = (rows: TvRow[]) => {
  const total = rows.reduce((sum, row) => sum + parseQty(row.orderQty || ''), 0);
  return `${rows.length}건 · ${total.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}kg`;
};

export function TvScheduleBoard({ load, emptyText, theme }: {
  load: (date: string) => Promise<TvRow[]>;
  emptyText: string; // '등록된 생산스케줄이 없습니다'
  theme?: 'logistics'; // 생산은 초록, 물류는 파랑
}) {
  const [base, setBase] = useState(() => todayDash());
  const [rows, setRows] = useState<Record<string, TvRow[] | null>>({}); // 없음 = 아직 불러오는 중
  const [spinning, setSpinning] = useState(false);
  const days = [
    { date: shiftDate(base, -1), label: '어제' },
    { date: base, label: '오늘', today: true },
    { date: shiftDate(base, 1), label: '내일' },
  ];
  const dates = days.map((day) => day.date).join(',');

  const loadAll = useCallback(async (list: string[]) => {
    await Promise.all(list.map(async (date) => {
      // 네트워크 순간 오류는 무시하고 다음 갱신에서 다시 시도한다(송연과 같음)
      const got = await load(date).catch(() => null);
      if (got) setRows((previous) => ({ ...previous, [date]: got }));
    }));
  }, [load]);

  useEffect(() => {
    const list = dates.split(',');
    void loadAll(list);
    const timer = setInterval(() => void loadAll(list), REFRESH_MS);
    return () => clearInterval(timer);
  }, [dates, loadAll]);

  return (
    <div className={theme ? `tv-screen ${theme}` : 'tv-screen'}>
      <div className="tv-accent-bar" />
      <div className="tv-cols">
        {days.map((day) => (
          <TvColumn
            key={day.date}
            date={day.date}
            today={Boolean(day.today)}
            rows={rows[day.date] ?? null}
            emptyText={emptyText}
            spinning={spinning}
            onPickDate={(value) => { if (value) setBase(value); }}
            onRefresh={() => {
              setSpinning(false);
              requestAnimationFrame(() => setSpinning(true));
              void loadAll(dates.split(','));
            }}
            onSpinEnd={() => setSpinning(false)}
          />
        ))}
      </div>
    </div>
  );
}

function TvColumn({ date, today, rows, emptyText, spinning, onPickDate, onRefresh, onSpinEnd }: {
  date: string;
  today: boolean;
  rows: TvRow[] | null;
  emptyText: string;
  spinning: boolean;
  onPickDate: (value: string) => void;
  onRefresh: () => void;
  onSpinEnd: () => void;
}) {
  const body = useRef<HTMLTableSectionElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // 송연 fitRowsToScreen: 줄이 많아도 한 화면에 들어가게 글자·여백을 줄인다
  const fit = useCallback(() => {
    const tbody = body.current;
    const box = wrap.current;
    if (!tbody || !box) return;
    const count = Math.max(tbody.querySelectorAll('tr').length, 1);
    const rowHeight = box.clientHeight / count;
    tbody.style.setProperty('--row-font', `${Math.max(6.5, Math.min(17, rowHeight * 0.4)).toFixed(1)}px`);
    tbody.style.setProperty('--row-pad-v', `${Math.max(0.5, Math.min(9, rowHeight * 0.22)).toFixed(1)}px`);
    tbody.style.setProperty('--sep-width', `${Math.max(1, Math.min(3, rowHeight * 0.06)).toFixed(1)}px`);
  }, []);
  useLayoutEffect(fit, [fit, rows]);
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  return (
    <div className={today ? 'tv-col today' : 'tv-col'}>
      <div className="tv-col-header">
        <span className="tv-col-date">{tvDateTitle(date)}</span>
        {today && (
          <>
            <span className="tv-icon-btn" title="날짜 변경">📅
              <input
                type="date"
                aria-label="날짜 변경"
                value={date}
                onChange={(event) => onPickDate(event.target.value)}
                onWheel={(event) => {
                  event.preventDefault();
                  onPickDate(shiftDate(date, event.deltaY < 0 ? 1 : -1));
                }}
              />
            </span>
            <button
              type="button"
              className={spinning ? 'tv-icon-btn spinning' : 'tv-icon-btn'}
              title="새로고침"
              aria-label="새로고침"
              onClick={onRefresh}
              onAnimationEnd={onSpinEnd}
            >
              ↻
            </button>
          </>
        )}
        <div className="tv-col-stats">{rows ? tvTotal(rows) : '- 건 · -kg'}</div>
      </div>
      <div className="tv-col-table-wrap" ref={wrap}>
        <table>
          <tbody ref={body}>
            {!rows && <tr><td colSpan={2} className="tv-empty">불러오는 중...</td></tr>}
            {rows && rows.length === 0 && <tr><td colSpan={2} className="tv-empty">{emptyText}</td></tr>}
            {rows?.map((row, index) => <TvEntry key={index} row={row} alt={index % 2 === 1 ? ' alt' : ''} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 비고가 있으면 줄 아래에 한 줄 더 붙는다(흰 바탕에 빨간 글씨 — 멀리서도 눈에 띈다)
function TvEntry({ row, alt }: { row: TvRow; alt: string }) {
  return (
    <>
      <tr className={`tv-entry-row${alt}${row.note ? ' has-note' : ''}`}>
        <td className="tv-product"><span className="tv-client">{row.clientName || ''}</span>{row.productName || ''}</td>
        <td className="tv-qty">{row.orderQty || '-'}</td>
      </tr>
      {row.note && (
        <tr className={`tv-note-row${alt}`}>
          <td colSpan={2} className="tv-note-cell"><span className="tv-note-line">{row.note}</span></td>
        </tr>
      )}
    </>
  );
}
