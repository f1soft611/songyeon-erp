import { describe, expect, it } from 'vitest';

import { HANDOFF_WHERE, handoffKindList, handoffRecipeName, handoffVersionOptions, shareVersionOptions, versionCountText } from '../src/pages/rd/recipeshare/utils/recipeShare';
import { emptyText, handoffTime, periodText, quoteGone, summaryText } from '../src/pages/rd/recipelog/utils/recipeLog';

const versions = [
  { id: 21, versionLabel: '초안', stage: '견적공유', handoffKinds: '견적,기타' },
  { id: 22, versionLabel: 'test1' },
  { id: 23, versionLabel: 'test2', stage: '신규확정' },
];

describe('레시피 검색·공유(송연 09-recipe.js 523~642 · 713~812)', () => {
  it('처리구분은 넘긴 기록만, 버전 수가 0 이면 없음', () => {
    expect(handoffKindList('견적,기타')).toEqual(['견적', '기타']);
    expect(handoffKindList(null)).toEqual([]);
    expect(versionCountText(3)).toBe('3개');
    expect(versionCountText(0)).toBe('없음');
    expect(versionCountText(null)).toBe('없음');
  });

  it('넘기기 창: 레시피 이름(업체 없으면 미분류), 버전은 최신이 맨 위 + 꼬리표, 어디로 가는지', () => {
    expect(handoffRecipeName(null, '떡볶이소스')).toBe('[미분류] 떡볶이소스');
    expect(handoffVersionOptions(versions)).toEqual([
      { value: 23, label: 'test2 🔒신규확정' },
      { value: 22, label: 'test1' },
      { value: 21, label: '초안 🔒견적·기타' },
    ]);
    expect(HANDOFF_WHERE.기타).toContain('표시사항 요청');
    expect(HANDOFF_WHERE.견적).toContain('가견적');
  });

  it('공유 창 버전: 꼬리표는 — 로, 최신에 (최신)', () => {
    expect(shareVersionOptions(versions).map((o) => o.label)).toEqual(['test2 — 신규확정 (최신)', 'test1', '초안 — 견적·기타']);
  });
});

describe('레시피 공유 로그(송연 09-recipe.js 644~711)', () => {
  it('기간 글자: 비면 전체 기간, 한쪽만이면 처음 · 오늘', () => {
    expect(periodText('', '')).toBe('전체 기간');
    expect(periodText('2026-10-01', '')).toBe('2026-10-01 ~ 오늘');
    expect(periodText('', '2026-10-14')).toBe('처음 ~ 2026-10-14');
    expect(summaryText('', '', 3)).toBe('전체 기간 · 3건');
    expect(summaryText('2026-10-01', '2026-10-14', 0)).toBe('2026-10-01 ~ 2026-10-14');
    expect(emptyText('', '')).toBe('전체 기간 에 넘긴 기록이 없습니다');
  });

  it('일시는 분까지, 견적이 지워졌으면 견적 없어짐(기타는 견적이 없다)', () => {
    expect(handoffTime('2026-10-14T10:40:12')).toBe('2026-10-14 10:40');
    expect(quoteGone({ id: 1, kind: '견적', quoteId: 7, quoteStatus: null })).toBe(true);
    expect(quoteGone({ id: 1, kind: '견적', quoteId: 7, quoteStatus: 'draft' })).toBe(false);
    expect(quoteGone({ id: 1, kind: '기타', quoteId: null })).toBe(false);
  });
});
