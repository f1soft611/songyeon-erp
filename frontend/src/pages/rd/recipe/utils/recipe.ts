// 상품개발 > 레시피 작성 (송연 09-recipe.js 4~521 · 04-product.js recalcRecipeBom · addRecipeBomRow)
// 업체 폴더 → 레시피 → 버전(초안 · test1 · test2 …). 배합표는 '중량' 을 적으면 배합비율(%)이 저절로 계산된다.

export type RecipeClient = { clientName: string; salesEmpId?: string | null; salesEmpName?: string | null; salesEmpDepartment?: string | null; recipeCount: number };
export type RecipeSalesRep = { id: string; name: string; department?: string | null };
export type RecipeDraft = {
  id: number;
  clientName?: string | null;
  name?: string | null;
  spec?: string | null;
  note?: string | null;
  category?: string | null;
  saleType?: string | null;
  remark?: string | null;
  updatedAt?: string | null;
  versionCount?: number | null;
  latestVersionId?: number | null;
  materialCount?: number | null;
  stages?: string | null;
  handoffKinds?: string | null;
};
export type RecipeVersion = { id: number; draftId?: number; versionLabel: string; note?: string | null; stage?: string | null; createdAt?: string | null; handoffKinds?: string | null };
export type RecipeBom = { materialCode?: string | null; materialName: string; weight?: number | null; ratioPercent?: number | null; unitPricePerKg?: number | null; amountPerKg?: number | null };
export type RecipeStageLog = { versionLabel?: string | null; stage?: string | null; employeeName?: string | null; createdAt?: string | null };

// 배합표 편집 한 줄. weight·unitPrice 는 화면 값
export type RecipeBomRow = { id: string; materialName: string; weight: number | null; unitPrice: number | null; materialCode: string | null };

let nextRowId = 0;
export const newRecipeRowId = () => `recipe-row-${nextRowId++}`;
export const emptyRecipeRow = (): RecipeBomRow => ({ id: newRecipeRowId(), materialName: '', weight: null, unitPrice: null, materialCode: null });
export const emptyRecipeRows = () => [emptyRecipeRow(), emptyRecipeRow(), emptyRecipeRow()];

// 불러온 배합표 → 편집 줄. 중량이 없으면(제품BOM·옛 레시피) 배합비율(%)을 중량 자리에 둔다(합이 같으니 비율도 같다)
export function rowsFromBom(bom: { materialName?: string | null; weight?: number | null; ratio?: number | null; unitPrice?: number | null; materialCode?: string | null }[]): RecipeBomRow[] {
  const rows = bom.map((b) => ({
    id: newRecipeRowId(),
    materialName: b.materialName || '',
    weight: b.weight != null ? b.weight : b.ratio != null ? Number((b.ratio * 100).toFixed(2)) : null,
    unitPrice: b.unitPrice ?? null,
    materialCode: b.materialCode || null,
  }));
  return rows.length ? rows : emptyRecipeRows();
}

// 송연 recalcRecipeBom: 줄마다 배합비율 = 중량 / 중량 합계, 적용단가 = 비율 × 원재료단가
export type RecipeCalc = { totalWeight: number; totalAmount: number; percent: (row: RecipeBomRow) => number | null; amount: (row: RecipeBomRow) => number | null };
export function calcRecipe(rows: RecipeBomRow[]): RecipeCalc {
  const totalWeight = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const percent = (r: RecipeBomRow) => (totalWeight > 0 ? ((Number(r.weight) || 0) / totalWeight) * 100 : null);
  const amount = (r: RecipeBomRow) => {
    const p = percent(r);
    return p != null && r.unitPrice != null && !Number.isNaN(Number(r.unitPrice)) ? (p / 100) * Number(r.unitPrice) : null;
  };
  const totalAmount = rows.reduce((s, r) => s + (amount(r) ?? 0), 0);
  return { totalWeight, totalAmount, percent, amount };
}

export const percentText = (p: number | null) => (p == null ? '' : `${p.toFixed(2)}%`);
export const fmt = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '' : v.toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
export const fmtPrice = (v: number | null | undefined) =>
  (v == null || !Number.isFinite(v) ? '' : (Math.round(v * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 }));

// 이 줄이 실제로 어느 원재료를 가리키는지(이름이 같은 원재료가 둘이면 이름만 보고는 알 수 없다)
export function codeCell(row: RecipeBomRow, materials: { code: string; name: string }[]): { text: string; overlap?: string } {
  if (row.materialCode) return { text: row.materialCode };
  const n = row.materialName.trim();
  const hits = n ? materials.filter((m) => m.name === n) : [];
  if (hits.length === 1) return { text: hits[0].code };
  if (hits.length > 1) {
    return { text: '겹침', overlap: `'${n}' 이라는 원재료가 ${hits.length}개예요 (${hits.map((h) => h.code).join(', ')}). 저장하면 코드가 작은 쪽으로 붙습니다.` };
  }
  return { text: '' };
}

// 저장할 배합표: 이름이 있고 비율이 0보다 큰 줄만(비율은 저장 직전 다시 계산한 퍼센트)
export function bomForSave(rows: RecipeBomRow[]) {
  const c = calcRecipe(rows);
  return rows
    .map((r) => ({
      materialName: r.materialName.trim(),
      materialCode: r.materialCode || null,
      weight: r.weight == null ? '' : String(r.weight),
      ratioPercent: c.percent(r),
      unitPrice: r.unitPrice == null ? '' : String(r.unitPrice),
    }))
    .filter((b) => b.materialName && b.ratioPercent != null && b.ratioPercent > 0);
}

// 버전 이름 옆 꼬리표: 어디로 넘겼는지. 넘긴 기록이 있으면 그것(여러 곳일 수 있다), 없으면 옛 분류
export const versionTag = (v: RecipeVersion) => (v.handoffKinds ? v.handoffKinds.split(',').join('·') : v.stage || '');
export const versionOption = (v: RecipeVersion) => `${v.versionLabel}${versionTag(v) ? ` 🔒${versionTag(v)}` : ''}`;

// 업체 폴더 찾기(이름 일부, 대소문자 무시)
export const filterClients = (rows: RecipeClient[], q: string) => {
  const k = q.trim().toLowerCase();
  return k ? rows.filter((c) => (c.clientName || '').toLowerCase().includes(k)) : rows;
};

// 인쇄(송연 recipe-print): A4 한 장. 제목 칸 '레시피명 (업체명)', TEST번호 · 날짜, 품목명 · 중량 · 함량
const escHtml = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
export function recipePrintHtml(recipeName: string, clientName: string, versionLabel: string, rows: { name: string; weight: string; percent: string }[], today = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}. ${pad(today.getMonth() + 1)}. ${pad(today.getDate())}`;
  const items = rows.map((r) => `
    <tr>
      <td>${escHtml(r.name)}</td>
      <td style="text-align:right;">${escHtml(r.weight)}</td>
      <td style="text-align:right;">${escHtml(r.percent)}</td>
    </tr>`).join('');
  return `<html><head><title>레시피 - ${escHtml(recipeName)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body{ margin:0; padding:0; background:#e8e8e8; }
      .page{ width:210mm; min-height:297mm; margin:16px auto; padding:15mm 14mm; background:#fff; box-shadow:0 0 8px rgba(0,0,0,.2);
        font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; color:#111; }
      table.header{ width:100%; border-collapse:collapse; margin-bottom:0; }
      table.header td{ border:1px solid #000; padding:8px 10px; font-size:13.5px; font-weight:700; }
      table.header td.title-cell{ color:#C05A1F; width:70%; }
      table.header td.meta-cell{ color:#1A6BC4; width:30%; }
      table.items{ width:100%; border-collapse:collapse; margin-top:0; }
      table.items th, table.items td{ border:1px solid #000; padding:6px 8px; font-size:12.5px; height:22px; }
      table.items th{ background:#fff; text-align:left; font-weight:700; }
      @page{ size:A4; margin:0; }
      @media print{ .no-print{ display:none; } html, body{ background:#fff; } .page{ margin:0; box-shadow:none; } }
    </style></head>
    <body>
      <div class="page">
        <table class="header">
          <tr>
            <td class="title-cell" rowspan="2">${escHtml(recipeName)} (${escHtml(clientName)})</td>
            <td class="meta-cell">TEST번호<br/><span style="font-weight:400;color:#111;">${escHtml(versionLabel)}</span></td>
          </tr>
          <tr><td class="meta-cell">날짜<br/><span style="font-weight:400;color:#111;">${todayStr}</span></td></tr>
        </table>
        <table class="items">
          <thead><tr><th>품목명</th><th>중량</th><th>함량</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
        <button class="no-print" onclick="window.print()" style="margin-top:24px;padding:8px 20px;font-size:13px;">인쇄하기</button>
      </div>
    </body></html>`;
}

// 엑셀 내려받기(송연 export-excel): 머리 네 줄(업체명·레시피명·규격·버전), 빈 줄, 배합표(배합비율은 % 숫자)
export function recipeExcelRows(draft: RecipeDraft, versionLabel: string, bom: RecipeBom[]): (string | number | null)[][] {
  return [
    ['업체명', draft.clientName || ''],
    ['레시피명', draft.name || ''],
    ['규격', draft.spec || ''],
    ['버전', versionLabel || ''],
    [],
    ['원재료명', '배합비율(%)', '원재료단가', '적용단가'],
    ...bom.map((b) => [b.materialName, b.ratioPercent != null ? b.ratioPercent * 100 : null, b.unitPricePerKg ?? null, b.amountPerKg ?? null]),
  ];
}
export const recipeExcelFileName = (name: string | null | undefined, versionLabel: string) => `${name || ''}_${versionLabel}.xlsx`.replace(/\//g, '-');
