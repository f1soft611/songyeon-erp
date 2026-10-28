import markers from '../data/legacy-calendar-markers.json';
import { useCalendar } from '../hooks/useCalendar';
import { MemoDialog } from './MemoDialog';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export function DashboardCalendar() {
  const { year, index, leading, slots, count, todayKey, selected, setSelected, previous, next, goToday, keyForDay } = useCalendar();
  return <>
    <section className="mes-calendar-panel" aria-label="대시보드 달력">
      <div className="mes-calendar-toolbar">
        <div className="mes-month-controls">
          <button className="mes-ghost" aria-label="이전 달" onClick={previous}>◀</button>
          <h2 aria-live="polite">{year}년 {index + 1}월</h2>
          <button className="mes-ghost" aria-label="다음 달" onClick={next}>▶</button>
        </div>
        <button className="mes-primary" onClick={goToday}>오늘</button>
      </div>
      <div className="mes-calendar-grid">
        {weekdays.map((day, position) => <div key={day} className={`mes-weekday ${position === 0 ? 'sunday' : position === 6 ? 'saturday' : ''}`}>{day}</div>)}
        {Array.from({ length: slots }, (_, position) => {
          const day = position - leading + 1;
          if (day < 1 || day > count) return <div key={position} className={`mes-calendar-empty ${day < 1 ? 'leading' : ''}`} />;
          const key = keyForDay(day);
          const marker = (markers as Record<string, string>)[key];
          const tone = marker || position % 7 === 0 ? 'sunday' : position % 7 === 6 ? 'saturday' : '';
          return <button key={position} className={`mes-calendar-day ${tone} ${key === todayKey ? 'today' : ''}`}
            aria-label={`${key}${marker ? ` ${marker}` : ''}`} aria-current={key === todayKey ? 'date' : undefined}
            onClick={() => setSelected(key)}>
            <span>{day}</span>{marker && <small>{marker}</small>}
          </button>;
        })}
      </div>
    </section>
    {selected && <MemoDialog date={selected} onClose={() => setSelected(null)} />}
  </>;
}
