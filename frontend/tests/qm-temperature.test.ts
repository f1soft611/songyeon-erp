import { describe, expect, it } from 'vitest';

import {
  UNGROUPED, availableChannels, batteryText, channelLabel, channelValueText, groupSections, rangeText, refreshToast, toTemp, valueText,
  type TempReading,
} from '../src/pages/qm/temperature/utils/temperature';

const r = (id: number, groupName: string | null, extra: Partial<TempReading> = {}): TempReading => ({ id, name: `센서${id}`, groupName, ok: true, ...extra });

describe('실시간 온도 utils(송연 13-delivery-statement.js · 14-temperature.js)', () => {
  it('그룹: 이름순, 미분류는 맨 뒤(센서가 있을 때), 빈 그룹도 남긴다', () => {
    const sections = groupSections([r(1, '냉장'), r(2, null), r(3, ' 냉동 '), r(4, '')], ['냉장', '가공실']);
    expect(sections.map((s) => s.label)).toEqual(['가공실', '냉동', '냉장', '미분류']);
    expect(sections.map((s) => s.rows.length)).toEqual([0, 1, 1, 2]);
    expect(sections[3].key).toBe(UNGROUPED);
    // 미분류가 비면 이름 있는 그룹만, 그룹이 하나도 없으면 빈 미분류 하나
    expect(groupSections([r(1, '냉장')], []).map((s) => s.label)).toEqual(['냉장']);
    expect(groupSections([], []).map((s) => s.label)).toEqual(['미분류']);
  });

  it('카드 글자: 값·기준·배터리(송연 문구)', () => {
    expect(valueText(r(1, null, { value: -18.4 }))).toBe('-18.4°C');
    expect(valueText(r(1, null, { value: null }))).toBe('-°C');
    expect(rangeText(r(1, null, { minTemp: -20, maxTemp: null }))).toBe('기준: -20~-°C');
    expect(rangeText(r(1, null))).toBe('');
    expect(batteryText(r(1, null, { battery: 80, lastUpdate: '2026-10-13 15:00:00' }))).toBe('배터리:80% · 2026-10-13 15:00:00');
    expect(batteryText(r(1, null))).toBe('배터리:- · -');
    expect(refreshToast('냉장', 180)).toBe('"냉장" 그룹은 3분마다 자동새로고침해요');
    expect(refreshToast('냉장', 0)).toBe('"냉장" 그룹 자동새로고침을 껐어요');
  });

  it('일괄등록: 이미 등록된 채널은 빼고, 이름은 장치명 - 채널명', () => {
    const channels = [{ channelKey: 'D|S1|1', deviceName: '1번 냉장고', chName: '온도', chUnit: '°C', chValue: 3.5 }, { channelKey: 'D|S2|1', deviceName: '냉동고', chName: '온도' }];
    const left = availableChannels(channels, [{ id: 1, name: 'x', sensorId: 'D|S1|1' }]);
    expect(left.map((c) => c.channelKey)).toEqual(['D|S2|1']);
    expect(channelLabel(channels[0])).toBe('1번 냉장고 - 온도');
    expect(channelValueText(channels[0])).toBe('3.5°C');
    expect(channelValueText(channels[1])).toBe('-');
  });

  it('기준 온도 칸: 비우면 없음, 숫자만', () => {
    expect(toTemp('')).toBeNull();
    expect(toTemp(' ')).toBeNull();
    expect(toTemp('-20.5')).toBe(-20.5);
    expect(toTemp('abc')).toBeNull();
  });
});
