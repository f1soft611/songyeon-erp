import { useState } from 'react';

const dateKey = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function useCalendar() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const year = month.getFullYear(), index = month.getMonth();
  const leading = new Date(year, index, 1).getDay();
  const count = new Date(year, index + 1, 0).getDate();
  const slots = Math.ceil((leading + count) / 7) * 7;
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  return { year, index, leading, slots, count, todayKey, selected, setSelected,
    previous: () => setMonth(new Date(year, index - 1, 1)),
    next: () => setMonth(new Date(year, index + 1, 1)),
    goToday: () => setMonth(new Date(today.getFullYear(), today.getMonth(), 1)),
    keyForDay: (day: number) => dateKey(year, index, day),
  };
}
