import { afterEach, describe, expect, it } from 'vitest';

import { clientProductDetailValues, readSearchSession, saveSearchSession } from '../src/shared/utils/searchSession';

// 2026-11-04 화면 조회조건 유지: 마지막으로 조회한 조건을 탭 세션에 두고, 다시 열 때 그 조건으로 연다(S_ERP usePageSessionState 방식)
describe('searchSession', () => {
  afterEach(() => window.sessionStorage.clear());

  const fallback = { period: { from: '2026-11-04', to: '2026-11-04' }, client: '' };

  it('저장한 조건이 없으면 처음 조건을 돌려준다', () => {
    expect(readSearchSession('pu-test', fallback)).toEqual(fallback);
  });

  it('저장한 조건을 다시 읽는다(화면마다 키가 따로)', () => {
    const saved = { period: { from: '2026-10-01', to: '2026-10-31' }, client: 'C01' };
    saveSearchSession('pu-test', saved);
    expect(readSearchSession('pu-test', fallback)).toEqual(saved);
    expect(readSearchSession('pu-other', fallback)).toEqual(fallback);
    expect(window.sessionStorage.getItem('songyeon-erp:page:pu-test')).toBe(JSON.stringify({ version: 1, value: saved }));
  });

  it('모양이 다른 값(예전 저장분 · 깨진 값)은 버리고 처음 조건으로 연다', () => {
    window.sessionStorage.setItem('songyeon-erp:page:pu-test', JSON.stringify({ version: 1, value: { period: '2026-10-01', client: 'C01' } }));
    expect(readSearchSession('pu-test', fallback)).toEqual(fallback);
    expect(window.sessionStorage.getItem('songyeon-erp:page:pu-test')).toBeNull();
    window.sessionStorage.setItem('songyeon-erp:page:pu-test', '{broken');
    expect(readSearchSession('pu-test', fallback)).toEqual(fallback);
  });

  it('상세 조회 값(빈 객체 자리)은 검색 값 모양이면 받는다', () => {
    const sample = { keyword: '', detailValues: {} as Record<string, unknown> };
    const saved = { keyword: '대한', detailValues: { saleDate: { from: '2026-10-01', to: '2026-10-31' }, kind: 'in' } };
    saveSearchSession('sl-test', saved);
    expect(readSearchSession('sl-test', sample)).toEqual(saved);
    saveSearchSession('sl-test', { keyword: '', detailValues: { bad: [1, 2] } });
    expect(readSearchSession('sl-test', sample)).toEqual(sample);
  });

  it('저장한 적이 없으면 null(조회한 적 없는 화면은 [조회]를 눌러야 부른다), 목록 자리는 목록이어야 한다', () => {
    const shape = { date: '', lines: [] as unknown[] };
    expect(readSearchSession<typeof shape | null>('pd-test', null, shape)).toBeNull();
    saveSearchSession('pd-test', { date: '2026-11-04', lines: [{ product: 'A', qty: 3 }] });
    expect(readSearchSession<typeof shape | null>('pd-test', null, shape)).toEqual({ date: '2026-11-04', lines: [{ product: 'A', qty: 3 }] });
    saveSearchSession('pd-test', { date: '2026-11-04', lines: null });
    expect(readSearchSession<typeof shape | null>('pd-test', null, shape)).toBeNull();
  });

  it('상세 조회 거래처 · 품목 조건을 칩 값으로(빈 조건은 뺀다)', () => {
    expect(clientProductDetailValues({ clientName: '대한', product: '' })).toEqual({ clientName: '대한' });
    expect(clientProductDetailValues({ clientName: '', product: 'P01' })).toEqual({ productName: 'P01' });
    expect(clientProductDetailValues({ clientName: '', product: '' })).toEqual({});
  });
});
