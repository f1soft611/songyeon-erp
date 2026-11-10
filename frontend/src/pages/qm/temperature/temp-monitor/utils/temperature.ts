// 품질관리 > 실시간 온도 (송연 13-delivery-statement.js 뒷부분 · 14-temperature.js 앞부분)
// 센서를 그룹(예: 1번 냉장고)으로 묶어 카드로 보여주고, 그룹마다 자동 새로고침 주기를 따로 둔다.

export type TempSensor = { id: number; name: string; sensorId: string; minTemp?: number | null; maxTemp?: number | null; groupName?: string | null };
export type TempGroup = { name: string; refreshIntervalSec: number };
export type TempChannel = { channelKey: string; deviceName?: string | null; chName?: string | null; chUnit?: string | null; chValue?: unknown };
export type TempReading = {
  id: number;
  name: string;
  minTemp?: number | null;
  maxTemp?: number | null;
  groupName?: string | null;
  ok: boolean;
  error?: string | null;
  value?: number | null;
  battery?: unknown;
  lastUpdate?: string | null;
  outOfRange?: boolean;
};
export type TempSettings = { configured: boolean; keyPreview: string };

export const UNGROUPED = '__ungrouped__';
export type TempSection = { key: string; label: string; rows: TempReading[] };

// 그룹으로 나눈다. 이름 있는 그룹은 가나다순, 미분류는 맨 뒤(센서가 있거나, 그룹이 하나도 없을 때만).
// 서버에 저장된 빈 그룹도 계속 보이게 둔다(센서를 끌어다 넣을 자리)
export function groupSections(rows: TempReading[], knownGroups: string[]): TempSection[] {
  const grouped = new Map<string, TempReading[]>();
  rows.forEach((r) => {
    const key = r.groupName && r.groupName.trim() ? r.groupName.trim() : UNGROUPED;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(r);
  });
  knownGroups.forEach((g) => { if (!grouped.has(g)) grouped.set(g, []); });
  const names = Array.from(grouped.keys()).filter((k) => k !== UNGROUPED).sort();
  const sections: TempSection[] = names.map((k) => ({ key: k, label: k, rows: grouped.get(k) ?? [] }));
  const ungrouped = grouped.get(UNGROUPED) ?? [];
  if (ungrouped.length > 0 || names.length === 0) sections.push({ key: UNGROUPED, label: '미분류', rows: ungrouped });
  return sections;
}

export const REFRESH_OPTIONS = [
  { value: 0, label: '자동새로고침 끔' },
  { value: 60, label: '1분마다' },
  { value: 180, label: '3분마다' },
  { value: 300, label: '5분마다' },
  { value: 600, label: '10분마다' },
];

export const refreshToast = (group: string, seconds: number) =>
  (seconds > 0 ? `"${group}" 그룹은 ${seconds / 60}분마다 자동새로고침해요` : `"${group}" 그룹 자동새로고침을 껐어요`);

// 카드 아랫줄: 기준(있을 때만) · 배터리 · 마지막 갱신
export const rangeText = (r: TempReading) =>
  (r.minTemp != null || r.maxTemp != null ? `기준: ${r.minTemp ?? '-'}~${r.maxTemp ?? '-'}°C` : '');
export const batteryText = (r: TempReading) => `배터리:${r.battery != null ? `${String(r.battery)}%` : '-'} · ${r.lastUpdate || '-'}`;
export const valueText = (r: TempReading) => `${r.value != null ? r.value : '-'}°C`;

// 일괄등록 이름은 '장치명 - 채널명'. 이미 등록된 채널은 목록에서 뺀다
export const channelLabel = (c: TempChannel) => `${c.deviceName || ''} - ${c.chName || ''}`;
export const availableChannels = (channels: TempChannel[], sensors: TempSensor[]) => {
  const existing = new Set(sensors.map((s) => s.sensorId));
  return channels.filter((c) => !existing.has(c.channelKey));
};
export const channelValueText = (c: TempChannel) => `${c.chValue != null ? String(c.chValue) : '-'}${c.chUnit || ''}`;

// 수정 창의 숫자칸: 비우면 기준 없음(null)
export const toTemp = (text: string): number | null => {
  if (text.trim() === '') return null;
  const v = Number(text);
  return Number.isFinite(v) ? v : null;
};
