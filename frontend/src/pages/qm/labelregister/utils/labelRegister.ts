import type { LabelCell, LabelFormat, LabelVersion } from '../../../../shared/components/LabelPrintDialog/label.types';

// 품질관리 > 라벨등록 (송연 25-label-register.js · 26-label-format.js · 27-label-request.js · 07-label.js 의 라벨 창)
// 라벨 한 장을 그리는 일은 공용 labelHtml.ts 가 한다. 여기는 목록 · 버전 · 양식 편집의 규칙만 둔다.

export type LabelState = 'done' | 'partial' | 'none';

export type LabelProductRow = {
  code: string;
  name?: string | null;
  spec?: string | null;
  currentVersion?: string | null;
  versionCount?: number | null;
  lastEdited?: string | null;
  labelState: LabelState;
};

export type LabelSourceProduct = { code: string; name?: string | null; spec?: string | null; versionId: number; versionLabel?: string | null };
export type LabelField = { id: number; name: string; createdAt?: string | null };
export type LabelTemplateRow = { id: number; name: string; size?: string | null; createdAt?: string | null };

export type LabelRequestRow = {
  id: number;
  status?: string | null;
  movedProductCode?: string | null;
  note?: string | null;
  versionLabel?: string | null;
  requestedByName?: string | null;
  requestedAt?: string | null;
  recipeName?: string | null;
  spec?: string | null;
  clientName?: string | null;
  fillState: LabelState;
};

// 라벨 칸(제품명 · 식품유형 · 내용량 …)을 다 채웠는지 — 목록의 꼬리표
export const LABEL_STATE_TEXT: Record<LabelState, string> = { done: '등록됨', partial: '작성중', none: '미등록' };
export const FILL_STATE_TEXT: Record<LabelState, string> = { done: '다 적음', partial: '적는 중', none: '아직' };

export type ProductFilter = 'all' | 'done' | 'todo';

// 거르기는 이미 받아온 목록 안에서 한다(서버에 다시 묻지 않는다)
export function filterProducts(rows: LabelProductRow[], filter: ProductFilter): LabelProductRow[] {
  if (filter === 'done') return rows.filter((r) => r.labelState === 'done');
  if (filter === 'todo') return rows.filter((r) => r.labelState !== 'done');
  return rows;
}

export const dateTime16 = (value: string | null | undefined) => (value || '').replace('T', ' ').slice(0, 16);

// 요청 목록의 상태 칸
export function requestStatusText(r: LabelRequestRow): string {
  if (r.movedProductCode) return `제품으로 옮김 (${r.movedProductCode})`;
  return r.status === 'done' ? '작성 완료' : '요청됨';
}

// 다음에 붙을 기본 이름(v3 처럼). 그대로 둬도 되고 고쳐도 된다
export function nextVersionName(versions: LabelVersion[]): string {
  const nums = versions.map((v) => parseInt(String(v.versionLabel).replace(/^[vV]/, ''), 10)).filter((n) => !Number.isNaN(n));
  return `v${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

// 버전 고르기 줄의 글자: "v2 — 사용중 (2026-10-13 관리자)"
export function versionOptionText(v: LabelVersion): string {
  const when = (v.createdAt || '').slice(0, 10);
  return `${v.versionLabel}${v.isCurrent ? ' — 사용중' : ''} (${when}${v.createdBy ? ` ${v.createdBy}` : ''})`;
}

// ===== 라벨 양식 편집 (송연 26-label-format.js) =====
// 칸에 넣을 수 있는 것은 글자(직접 적기) · 항목 값(제품마다 다름) · 특별한 칸(제품명 · 날짜 · 바코드처럼 프로그램이 채움)
export const LFMT_BASIC_FIELDS = [
  { v: 'food_type', t: '식품유형' },
  { v: 'net_weight', t: '내용량' },
  { v: 'allergens', t: '알러지유발원재료' },
  { v: 'manufacture_report_no', t: '품목제조보고번호' },
  { v: 'packaging_material', t: '포장재질(내면)' },
  { v: 'storage', t: '보관방법' },
];
export const LFMT_SPECIALS = [
  { v: 'title', t: '제품명' },
  { v: 'date', t: '제조년월일' },
  { v: 'expiry', t: '소비기한' },
  { v: 'html:ingredients_text', t: '원재료명 및 함량 (서식 있는 글)' },
  { v: 'company:address', t: '영업소의 명칭 및 소재지' },
  { v: 'company:return_exchange_location', t: '반품 및 교환' },
  { v: 'company:customer_service_phone', t: '고객상담실' },
  { v: 'notice', t: '주의사항 (+분리배출마크)' },
  { v: 'barcode', t: '제품코드 바코드' },
  { v: 'blank', t: '빈칸 (해썹 마크 자리)' },
];
export const LFMT_MIN_COL = 2; // 칸 하나가 이보다 좁아지면 글자가 들어가지 않는다

export type Sel = { r1: number; c1: number; r2: number; c2: number };
type Slot = { cell: LabelCell; r0: number; c0: number } | null;

export const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// 병합이 섞이면 '몇 번째 줄 몇 번째 칸' 만으로는 위치를 알 수 없다. 실제 격자를 펼쳐 어느 자리를 어느 칸이 차지하는지 표로 만든다.
export function formatGrid(fmt: LabelFormat): Slot[][] {
  const n = fmt.cols.length;
  const grid: Slot[][] = [];
  fmt.rows.forEach((row, r) => {
    if (!grid[r]) grid[r] = new Array(n).fill(null);
    let c = 0;
    row.cells.forEach((cell) => {
      while (c < n && grid[r][c]) c++; // 위에서 내려온 칸이 차지한 자리는 건너뛴다
      const span = cell.span || 1;
      const rowspan = cell.rowspan || 1;
      for (let dr = 0; dr < rowspan; dr++) {
        const rr = r + dr;
        if (!grid[rr]) grid[rr] = new Array(n).fill(null);
        for (let dc = 0; dc < span; dc++) {
          // 이미 차 있는 자리는 덮어쓰지 않는다(덮어쓰면 줄마다 칸 수 계산이 틀린다)
          if (c + dc < n && !grid[rr][c + dc]) grid[rr][c + dc] = { cell, r0: r, c0: c };
        }
      }
      c += span;
    });
  });
  return grid;
}

// 줄마다 칸이 격자를 빈틈없이 채워야 표가 어그러지지 않는다. 모자라면 빈 글자칸을 채우고, 넘치면 마지막 칸을 줄인다
export function normalizeFormat(fmt: LabelFormat): void {
  const n = fmt.cols.length;
  fmt.rows.forEach((row, r) => {
    const grid = formatGrid(fmt);
    let fromAbove = 0;
    for (let c = 0; c < n; c++) {
      const g = grid[r] && grid[r][c];
      if (g && g.r0 < r) fromAbove++;
    }
    let total = row.cells.reduce((s, c) => s + (c.span || 1), 0) + fromAbove;
    while (total > n && row.cells.length > 1) {
      const last = row.cells[row.cells.length - 1];
      const over = total - n;
      if ((last.span || 1) > over) {
        last.span = (last.span || 1) - over;
        total = n;
      } else {
        total -= last.span || 1;
        row.cells.pop();
      }
    }
    if (total < n) row.cells.push({ type: 'label', span: n - total, text: '' });
  });
}

// 고른 범위를 하나로 합친다(엑셀의 '병합하고 가운데 맞춤'). 왼쪽 위 칸만 남기고 나머지는 지운다. 잘못이면 문구
export function mergeSelection(fmt: LabelFormat, sel: Sel | null): { error: string } | { sel: Sel } {
  if (!sel) return { error: '고를 칸이 없어요' };
  const { r1, c1, r2, c2 } = sel;
  if (r1 === r2 && c1 === c2) return { error: '두 칸 이상 골라주세요' };
  const grid = formatGrid(fmt);
  const keep = grid[r1] && grid[r1][c1];
  if (!keep) return { error: '고른 자리를 찾을 수 없어요' };
  const doomed = new Set<LabelCell>();
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const g = grid[r] && grid[r][c];
      if (g && g.cell !== keep.cell) doomed.add(g.cell);
    }
  }
  fmt.rows.forEach((row) => { row.cells = row.cells.filter((c) => !doomed.has(c)); });
  keep.cell.span = c2 - c1 + 1;
  keep.cell.rowspan = r2 - r1 + 1;
  if (keep.cell.rowspan === 1) delete keep.cell.rowspan;
  return { sel: { r1, c1, r2: r1, c2: c1 } };
}

// 고른 범위 안에서 '합쳐진 칸' 을 모두 푼다. 아래에서 위로(위쪽을 먼저 풀면 아래 줄의 칸 위치가 밀린다)
export function unmergeSelection(fmt: LabelFormat, sel: Sel | null): string | null {
  if (!sel) return '고를 칸이 없어요';
  const { r1, c1, r2, c2 } = sel;
  const grid = formatGrid(fmt);
  const targets: NonNullable<Slot>[] = [];
  const seen = new Set<LabelCell>();
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const g = grid[r] && grid[r][c];
      if (!g || seen.has(g.cell)) continue;
      seen.add(g.cell);
      if ((g.cell.span || 1) > 1 || (g.cell.rowspan || 1) > 1) targets.push(g);
    }
  }
  if (!targets.length) return '합쳐진 칸이 없어요';
  targets.sort((a, b) => b.r0 - a.r0 || b.c0 - a.c0);
  targets.forEach((g) => {
    const cell = g.cell;
    const span = cell.span || 1;
    const rowspan = cell.rowspan || 1;
    const before = formatGrid(fmt);
    cell.span = 1;
    delete cell.rowspan;
    const row = fmt.rows[g.r0];
    const at = row.cells.indexOf(cell);
    for (let i = 1; i < span; i++) row.cells.splice(at + i, 0, { type: 'label', span: 1, text: '' });
    // 아래로 비워진 자리: 그 줄에서 '몇 번째 칸 자리에' 넣어야 하는지 세어서 끼운다(끝에 붙이면 엉뚱한 곳이 빈다)
    for (let dr = 1; dr < rowspan; dr++) {
      const rr = g.r0 + dr;
      const lower = fmt.rows[rr];
      if (!lower) continue;
      let idx = 0;
      for (let c = 0; c < g.c0; c++) {
        const gg = before[rr] && before[rr][c];
        if (gg && gg.r0 === rr && gg.c0 === c) idx++;
      }
      const fillers: LabelCell[] = [];
      for (let i = 0; i < span; i++) fillers.push({ type: 'label', span: 1, text: '' });
      lower.cells.splice(idx, 0, ...fillers);
    }
  });
  return null;
}

// 고른 칸의 폭을 넓히거나 좁힌다. 옆 칸과 주고받으므로 폭 합계는 언제나 종이 가로와 같다
export function resizeSelection(fmt: LabelFormat, sel: Sel | null, delta: number): string | null {
  if (!sel) return '먼저 칸을 골라주세요';
  const cols = fmt.cols;
  const last = sel.c2;
  const partner = last + 1 < cols.length ? last + 1 : sel.c1 - 1;
  if (partner < 0) return '옆에 주고받을 칸이 없어요';
  const target = partner === last + 1 ? last : sel.c1;
  const a = Math.round((cols[target] + delta) * 10) / 10;
  const b = Math.round((cols[partner] - delta) * 10) / 10;
  if (a < LFMT_MIN_COL) return `더 좁힐 수 없어요 (한 칸은 최소 ${LFMT_MIN_COL}mm)`;
  if (b < LFMT_MIN_COL) return `옆 칸이 너무 좁아져요 (한 칸은 최소 ${LFMT_MIN_COL}mm)`;
  cols[target] = a;
  cols[partner] = b;
  return null;
}

// 초기화: 빈 표(줄 1~40 · 칸 1~20). 칸 폭은 고르게, 나머지는 마지막 칸에 몰아 합계를 정확히 맞춘다
export function blankFormat(paperW: number, rowsText: string, colsText: string): Pick<LabelFormat, 'cols' | 'rows'> {
  const rowCount = Math.min(Math.max(parseInt(rowsText, 10) || 12, 1), 40);
  const colCount = Math.min(Math.max(parseInt(colsText, 10) || 6, 1), 20);
  const each = Math.round((paperW / colCount) * 10) / 10;
  const cols = new Array(colCount).fill(each) as number[];
  cols[colCount - 1] = Math.round((paperW - each * (colCount - 1)) * 10) / 10;
  return { cols, rows: Array.from({ length: rowCount }, () => ({ cells: Array.from({ length: colCount }, () => ({ type: 'label' as const, span: 1, text: '' })) })) };
}

// 고른 범위를 끝칸 두 개로 계산(합쳐진 칸이면 그 칸 끝까지)
export function selectionBetween(grid: Slot[][], a: { r: number; c: number }, b: { r: number; c: number }): Sel | null {
  const ga = grid[a.r] && grid[a.r][a.c];
  const gb = grid[b.r] && grid[b.r][b.c];
  if (!ga || !gb) return null;
  return {
    r1: Math.min(ga.r0, gb.r0),
    c1: Math.min(ga.c0, gb.c0),
    r2: Math.max(ga.r0 + (ga.cell.rowspan || 1) - 1, gb.r0 + (gb.cell.rowspan || 1) - 1),
    c2: Math.max(ga.c0 + (ga.cell.span || 1) - 1, gb.c0 + (gb.cell.span || 1) - 1),
  };
}

export function selectedCell(fmt: LabelFormat, sel: Sel | null): LabelCell | null {
  if (!sel) return null;
  const g = formatGrid(fmt)[sel.r1]?.[sel.c1];
  return g ? g.cell : null;
}

export type CellKind = 'text' | 'value' | 'special';
export const cellKind = (cell: LabelCell): CellKind => (cell.type === 'label' ? 'text' : cell.type === 'field' ? 'value' : 'special');
export function cellSpecialValue(cell: LabelCell): string {
  if (cell.type === 'html') return `html:${cell.field || 'ingredients_text'}`;
  if (cell.type === 'company') return `company:${cell.key || 'address'}`;
  return cell.type;
}

// 칸 설정을 바꾼다. 종류가 바뀌면 예전 설정이 남지 않게 지운다(라벨 그리는 쪽이 아는 type/field/key 로)
export function applyCellEdit(cell: LabelCell, edit: { kind: CellKind; text: string; field: string; special: string; size: string; align: string }): void {
  delete cell.text;
  delete cell.field;
  delete cell.key;
  delete cell.recycle;
  delete cell.cls;
  if (edit.kind === 'text') {
    cell.type = 'label';
    cell.text = edit.text;
  } else if (edit.kind === 'value') {
    cell.type = 'field';
    cell.field = edit.field;
  } else {
    const v = edit.special;
    if (v.startsWith('html:')) {
      cell.type = 'html';
      cell.field = v.slice(5);
      cell.cls = 'ing';
    } else if (v.startsWith('company:')) {
      cell.type = 'company';
      cell.key = v.slice(8);
    } else {
      cell.type = v as LabelCell['type'];
      if (v === 'notice') { cell.recycle = true; cell.cls = 'notice'; }
      if (v === 'blank') cell.cls = 'haccp-space';
      if (v === 'title') cell.cls = 'lbl-title';
    }
  }
  const size = parseFloat(edit.size);
  if (Number.isNaN(size)) delete cell.size; else cell.size = size;
  if (edit.align) cell.align = edit.align; else delete cell.align;
}

// 칸 폭 합계 안내(종이 가로와 0.5mm 넘게 다르면 빨갛게)
export function colSumText(fmt: LabelFormat): { text: string; ok: boolean } {
  const sum = fmt.cols.reduce((s, w) => s + w, 0);
  const ok = Math.abs(sum - fmt.paper.w) < 0.51;
  return { text: `합계 ${sum.toFixed(1)}mm / 종이 ${fmt.paper.w}mm${ok ? '' : ' — 맞지 않아요'}`, ok };
}

// 고른 칸 설명
export function selectionText(sel: Sel, cell: LabelCell): string {
  const many = sel.r2 > sel.r1 || sel.c2 > sel.c1;
  if (many) return `${sel.r1 + 1}~${sel.r2 + 1}번째 줄 · ${sel.c1 + 1}~${sel.c2 + 1}번째 칸 을 골랐습니다`;
  const merged = (cell.span || 1) > 1 || (cell.rowspan || 1) > 1 ? ` (가로 ${cell.span || 1}칸, 세로 ${cell.rowspan || 1}줄 합쳐짐)` : '';
  return `${sel.r1 + 1}번째 줄 · ${sel.c1 + 1}번째 칸${merged}`;
}

export function selectionWidthMm(fmt: LabelFormat, sel: Sel): number {
  let mm = 0;
  for (let c = sel.c1; c <= sel.c2 && c < fmt.cols.length; c++) mm += fmt.cols[c];
  return Math.round(mm * 10) / 10;
}

// 양식에만 있는 항목(예: 유통전문판매원) — 고른 양식이 쓰는 항목 중 늘 있는 입력칸으로 못 받는 것
export function extraFieldsOf(fmt: LabelFormat | null, stdFields: Record<string, string>): string[] {
  const used: string[] = [];
  fmt?.rows?.forEach((row) => (row.cells || []).forEach((cell) => {
    if (cell.type === 'field' && cell.field && !(cell.field in stdFields) && !used.includes(cell.field)) used.push(cell.field);
  }));
  return used;
}
