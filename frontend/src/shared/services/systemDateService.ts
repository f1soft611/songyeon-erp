import { apiGet } from './apiClient';

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1];
}

export async function getSystemDate(): Promise<string> {
  const response = await apiGet<{ today: string }>('/api/v1/common/system-date');
  if (typeof response?.today !== 'string' || !isIsoDate(response.today)) {
    throw new Error('Invalid system date returned by the server.');
  }
  return response.today;
}
