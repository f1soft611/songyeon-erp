import { describe, expect, it } from 'vitest';

import { LABEL_FORMAT_BASIC, LABEL_STD_FIELDS } from '../src/shared/components/LabelPrintDialog/labelHtml';
import type { LabelFormat } from '../src/shared/components/LabelPrintDialog/label.types';
import {
  applyCellEdit, blankFormat, cellKind, cellSpecialValue, colSumText, deepCopy, extraFieldsOf, filterProducts, formatGrid, mergeSelection,
  nextVersionName, normalizeFormat, requestStatusText, resizeSelection, selectedCell, selectionBetween, selectionText, unmergeSelection, versionOptionText,
  type LabelProductRow,
} from '../src/pages/qm/labelregister/utils/labelRegister';

const basic = () => deepCopy(LABEL_FORMAT_BASIC);
const cellsPerRow = (fmt: LabelFormat) => fmt.rows.map((r) => r.cells.length);

describe('라벨양식 편집(송연 26-label-format.js)', () => {
  it('격자: 해썹 자리(3칸×3줄)가 아래 두 줄의 오른쪽을 차지한다', () => {
    const grid = formatGrid(basic());
    expect(grid[0][3]?.cell.cls).toBe('haccp-space');
    expect(grid[2][5]?.r0).toBe(0);
    expect(grid[3][5]?.cell.field).toBe('net_weight');
  });

  it('맞추기: 모자란 줄은 빈 글자칸을 채우고, 넘치는 줄은 마지막 칸을 줄인다', () => {
    const fmt: LabelFormat = { paper: { w: 100, h: 50 }, cols: [50, 50], rows: [
      { cells: [{ type: 'label', span: 1 }] },
      { cells: [{ type: 'label', span: 1 }, { type: 'label', span: 2 }] },
      { cells: [{ type: 'label', span: 3 }] },
    ] };
    normalizeFormat(fmt);
    expect(fmt.rows[0].cells.map((c) => c.span)).toEqual([1, 1]);
    expect(fmt.rows[1].cells.map((c) => c.span)).toEqual([1, 1]);
    // 칸이 하나뿐인 줄은 송연처럼 그대로 둔다(저장할 때 서버 검사가 '오른쪽으로 넘칩니다' 로 막는다)
    expect(fmt.rows[2].cells.map((c) => c.span)).toEqual([3]);
  });

  it('병합: 고른 범위를 왼쪽 위 칸 하나로, 한 칸만 고르면 막는다', () => {
    const fmt = blankFormat(100, '3', '4') as LabelFormat;
    fmt.paper = { w: 100, h: 50 };
    expect(mergeSelection(fmt, null)).toEqual({ error: '고를 칸이 없어요' });
    expect(mergeSelection(fmt, { r1: 0, c1: 0, r2: 0, c2: 0 })).toEqual({ error: '두 칸 이상 골라주세요' });
    const r = mergeSelection(fmt, { r1: 0, c1: 1, r2: 1, c2: 2 });
    expect(r).toEqual({ sel: { r1: 0, c1: 1, r2: 0, c2: 1 } });
    normalizeFormat(fmt);
    expect(fmt.rows[0].cells[1]).toMatchObject({ span: 2, rowspan: 2 });
    expect(cellsPerRow(fmt)).toEqual([3, 2, 4]);
    const grid = formatGrid(fmt);
    expect(grid[1][2]?.r0).toBe(0);
  });

  it('병합해제: 합쳐진 칸을 모두 풀고, 아래 줄에는 제자리에 빈칸을 끼운다', () => {
    const fmt = basic();
    expect(unmergeSelection(fmt, { r1: 4, c1: 0, r2: 4, c2: 0 })).toBe('합쳐진 칸이 없어요');
    expect(unmergeSelection(fmt, { r1: 0, c1: 3, r2: 0, c2: 3 })).toBeNull();
    normalizeFormat(fmt);
    // 해썹 자리(3칸×3줄)가 풀리면 1·2번째 줄은 오른쪽 세 자리에 빈칸이 생긴다
    expect(cellsPerRow(fmt).slice(0, 3)).toEqual([4, 5, 5]);
    expect(fmt.rows[1].cells.slice(2).every((c) => c.type === 'label' && c.text === '')).toBe(true);
    expect(fmt.rows[0].cells[1]).toMatchObject({ span: 1 });
  });

  it('칸 폭: 옆 칸과 주고받아 합계가 그대로, 2mm 보다 좁게는 못 한다, 마지막 칸은 왼쪽 칸과', () => {
    const fmt = basic();
    expect(resizeSelection(fmt, null, 1)).toBe('먼저 칸을 골라주세요');
    expect(resizeSelection(fmt, { r1: 1, c1: 0, r2: 1, c2: 0 }, 1)).toBeNull();
    expect(fmt.cols.slice(0, 2)).toEqual([23, 33]);
    expect(resizeSelection(fmt, { r1: 3, c1: 5, r2: 3, c2: 5 }, 0.5)).toBeNull();
    expect(fmt.cols.slice(4)).toEqual([9.5, 13.5]);
    expect(resizeSelection(fmt, { r1: 0, c1: 3, r2: 0, c2: 3 }, -1)).toBe('더 좁힐 수 없어요 (한 칸은 최소 2mm)');
    expect(colSumText(fmt)).toEqual({ text: '합계 100.0mm / 종이 100mm', ok: true });
    fmt.cols[0] = 30;
    expect(colSumText(fmt).ok).toBe(false);
  });

  it('초기화: 빈 표 줄 1~40·칸 1~20, 폭은 고르게 나머지는 마지막 칸', () => {
    const b = blankFormat(100, '3', '3');
    expect(b.cols).toEqual([33.3, 33.3, 33.4]);
    expect(b.rows).toHaveLength(3);
    expect(blankFormat(100, '99', 'x').rows).toHaveLength(40);
    // 숫자가 아니거나 0 이면 송연처럼 12줄 · 6칸
    expect(blankFormat(100, '0', '0').rows).toHaveLength(12);
    expect(blankFormat(100, '0', '0').cols).toEqual([16.7, 16.7, 16.7, 16.7, 16.7, 16.5]);
  });

  it('칸 설정: 종류를 바꾸면 예전 설정을 지우고, 주의사항은 마크 자리 · 해썹 빈칸 · 원재료명은 서식 칸', () => {
    const fmt = basic();
    const sel = selectionBetween(formatGrid(fmt), { r: 10, c: 1 }, { r: 10, c: 1 });
    const cell = selectedCell(fmt, sel)!;
    expect(cellKind(cell)).toBe('special');
    expect(cellSpecialValue(cell)).toBe('notice');
    applyCellEdit(cell, { kind: 'text', text: '보관상 주의', field: '', special: '', size: '6.5', align: 'left' });
    expect(cell).toEqual({ type: 'label', span: 5, text: '보관상 주의', size: 6.5, align: 'left' });
    applyCellEdit(cell, { kind: 'special', text: '', field: '', special: 'notice', size: '', align: '' });
    expect(cell).toEqual({ type: 'notice', span: 5, recycle: true, cls: 'notice' });
    applyCellEdit(cell, { kind: 'special', text: '', field: '', special: 'company:customer_service_phone', size: '', align: '' });
    expect(cell).toMatchObject({ type: 'company', key: 'customer_service_phone' });
    applyCellEdit(cell, { kind: 'value', text: '', field: '유통전문판매원', special: '', size: '', align: '' });
    expect(extraFieldsOf(fmt, LABEL_STD_FIELDS)).toEqual(['유통전문판매원']);
    // 합쳐진 칸을 누르면 그 칸 끝까지 고른다(범위로 보인다). 병합 직후처럼 시작 칸만 고른 때는 합쳐진 크기를 알려준다
    expect(selectionText(sel!, cell)).toBe('11~11번째 줄 · 2~6번째 칸 을 골랐습니다');
    expect(selectionText({ r1: 10, c1: 1, r2: 10, c2: 1 }, cell)).toBe('11번째 줄 · 2번째 칸 (가로 5칸, 세로 1줄 합쳐짐)');
    expect(selectionText({ r1: 0, c1: 0, r2: 1, c2: 2 }, cell)).toBe('1~2번째 줄 · 1~3번째 칸 을 골랐습니다');
  });
});

describe('라벨등록 목록 · 버전(송연 25-label-register.js · 07-label.js)', () => {
  it('거르기와 상태 글자', () => {
    const rows: LabelProductRow[] = [{ code: '1', labelState: 'done' }, { code: '2', labelState: 'partial' }, { code: '3', labelState: 'none' }];
    expect(filterProducts(rows, 'done').map((r) => r.code)).toEqual(['1']);
    expect(filterProducts(rows, 'todo').map((r) => r.code)).toEqual(['2', '3']);
    expect(filterProducts(rows, 'all')).toHaveLength(3);
    expect(requestStatusText({ id: 1, fillState: 'none', movedProductCode: 'P1' })).toBe('제품으로 옮김 (P1)');
    expect(requestStatusText({ id: 1, fillState: 'none', status: 'done' })).toBe('작성 완료');
    expect(requestStatusText({ id: 1, fillState: 'none', status: 'requested' })).toBe('요청됨');
  });

  it('다음 버전 이름은 쓴 번호 중 가장 큰 것 다음, 고르는 줄 글자', () => {
    expect(nextVersionName([])).toBe('v1');
    expect(nextVersionName([{ id: 1, versionLabel: 'v1' }, { id: 2, versionLabel: 'V4' }, { id: 3, versionLabel: '개정판' }])).toBe('v5');
    // 송연 화면과 같이 parseInt 는 앞쪽 숫자를 읽는다('2026 개정' → 2026). 화면이 권하는 이름일 뿐이고 고쳐 쓸 수 있다
    expect(nextVersionName([{ id: 1, versionLabel: '2026 개정' }])).toBe('v2027');
    expect(versionOptionText({ id: 1, versionLabel: 'v2', isCurrent: 1, createdAt: '2026-10-13T15:00:00', createdBy: '관리자' })).toBe('v2 — 사용중 (2026-10-13 관리자)');
    expect(versionOptionText({ id: 1, versionLabel: 'v3', isCurrent: 0, createdAt: '2026-10-13T15:00:00' })).toBe('v3 (2026-10-13)');
  });
});
