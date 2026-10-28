import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import type { BomEditRow, MaterialOption } from '../../../co/master/item-master/types/itemMaster.types';
import { formatPrice } from '../../../../shared/utils/numberFormat';
import { materialNamePatch } from '../../../co/master/item-master/utils/productBom';

// 영업관리 > 견적 (송연 SA0003, 업체 양식은 파이썬 05-quote.js)

// 서버 QuoteVO(목록 한 줄)
export type QuoteRow = {
  quoteId: number;
  productName?: string | null;
  spec?: string | null;
  productType?: string | null;
  storage?: string | null; // 보관방법 코드(2026-10-23)
  storageNm?: string | null;
  clientName?: string | null; // 거래처마스터 이름(서버가 붙여 준다)
  clientCode?: string | null; // 거래처코드(2026-10-23, 견적에는 이 코드를 저장한다)
  note?: string | null;
  totalPrice?: number | null; // 견적단가(확정단가가 있으면 그 값)
  status?: 'draft' | 'confirmed' | string | null;
  confirmedProductCode?: string | null;
  sourceKind?: string | null; // 레시피에서 넘어온 견적
  sourceRecipe?: string | null;
};

export type QuoteBomLine = { materialName?: string | null; ratioPercent?: number | null; unitPrice?: number | null; materialCode?: string | null };

// 원가 항목(견적 저장, 확정할 때 단가관리로 넘기는 값)
export type QuoteCosts = {
  markupRate: number | null;
  lossRate: number | null;
  laborCost: number | null;
  packagingCost: number | null;
  logisticsCost: number | null;
  margin: number | null;
  otherCost1: number | null; otherCost1Note: string | null;
  otherCost2: number | null; otherCost2Note: string | null;
  otherCost3: number | null; otherCost3Note: string | null;
  otherCost4: number | null; otherCost4Note: string | null;
  currentPrice: number | null;
};

export type QuoteDetail = QuoteRow & Partial<QuoteCosts> & { bom?: QuoteBomLine[] };

// 가견적 입력칸(모두 글자). 저장할 때 숫자·null 로 바꾼다.
export type QuoteForm = {
  productName: string; spec: string; productType: string; storage: string; clientCode: string; note: string;
  markupRate: string; lossRate: string; laborCost: string; packagingCost: string; logisticsCost: string; margin: string;
  otherCost1: string; otherCost1Note: string; otherCost2: string; otherCost2Note: string;
  otherCost3: string; otherCost3Note: string; otherCost4: string; otherCost4Note: string;
  currentPrice: string;
};
export type QuoteFormField = keyof QuoteForm;

export const EMPTY_QUOTE_FORM: QuoteForm = {
  productName: '', spec: '', productType: '', storage: '', clientCode: '', note: '',
  markupRate: '', lossRate: '', laborCost: '', packagingCost: '', logisticsCost: '', margin: '',
  otherCost1: '', otherCost1Note: '', otherCost2: '', otherCost2Note: '',
  otherCost3: '', otherCost3Note: '', otherCost4: '', otherCost4Note: '', currentPrice: '',
};

const num = (value: string) => parseFloat(value) || 0;
const text = (value: string | number | null | undefined) => (value === null || value === undefined ? '' : String(value));

// 원재료비 = Σ(배합비율/100 × 단가). 이름·배합비율·단가가 있는 줄만
export function bomMaterialCost(rows: Pick<BomEditRow, 'materialName' | 'ratioPercent' | 'unitPrice'>[]): number {
  return rows.reduce((sum, row) => {
    if (!row.materialName?.trim() || row.ratioPercent == null || row.unitPrice == null) return sum;
    return sum + (Number(row.ratioPercent) / 100) * Number(row.unitPrice);
  }, 0);
}

// 송연 updateQuoteHints: 원재료비 → 고정마진 → 로스 → 인건비·포장비·물류비·마진·기타1~4
export function computeQuote(form: QuoteForm, rows: Pick<BomEditRow, 'materialName' | 'ratioPercent' | 'unitPrice'>[]) {
  const materialCost = bomMaterialCost(rows);
  const markupAmount = (materialCost * num(form.markupRate)) / 100;
  const afterMarkup = materialCost + markupAmount;
  const lossAmount = (afterMarkup * num(form.lossRate)) / 100;
  const afterLoss = afterMarkup + lossAmount;
  const total = afterLoss + num(form.laborCost) + num(form.packagingCost) + num(form.logisticsCost) + num(form.margin)
    + num(form.otherCost1) + num(form.otherCost2) + num(form.otherCost3) + num(form.otherCost4);
  return { materialCost, markupAmount, afterMarkup, lossAmount, afterLoss, total };
}

// 송연 저장 규칙: 율은 빈칸만 null, 금액은 빈칸·0 이 null
const rateOrNull = (value: string) => (value.trim() === '' || Number.isNaN(parseFloat(value)) ? null : parseFloat(value));
const amountOrNull = (value: string) => parseFloat(value) || null;
const textOrNull = (value: string) => value.trim() || null;

export function quoteCostsOf(form: QuoteForm): QuoteCosts {
  return {
    markupRate: rateOrNull(form.markupRate),
    lossRate: rateOrNull(form.lossRate),
    laborCost: amountOrNull(form.laborCost),
    packagingCost: amountOrNull(form.packagingCost),
    logisticsCost: amountOrNull(form.logisticsCost),
    margin: amountOrNull(form.margin),
    otherCost1: amountOrNull(form.otherCost1), otherCost1Note: textOrNull(form.otherCost1Note),
    otherCost2: amountOrNull(form.otherCost2), otherCost2Note: textOrNull(form.otherCost2Note),
    otherCost3: amountOrNull(form.otherCost3), otherCost3Note: textOrNull(form.otherCost3Note),
    otherCost4: amountOrNull(form.otherCost4), otherCost4Note: textOrNull(form.otherCost4Note),
    currentPrice: amountOrNull(form.currentPrice),
  };
}

// 저장 본문: 원재료명·배합비율이 있는 배합비 줄만, 목록에서 맞춘 원재료는 코드도 보낸다
export function toQuoteSaveBody(form: QuoteForm, rows: BomEditRow[]) {
  return {
    productName: form.productName.trim(),
    spec: textOrNull(form.spec),
    productType: textOrNull(form.productType),
    storage: textOrNull(form.storage),
    clientCode: textOrNull(form.clientCode), // 2026-10-23 거래처코드
    note: textOrNull(form.note),
    bom: rows
      .filter((row) => row.materialName.trim() && row.ratioPercent != null && Number(row.ratioPercent) !== 0)
      .map((row) => ({
        materialName: row.materialName.trim(),
        ratioPercent: Number(row.ratioPercent),
        unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
        ...(row.materialCode ? { materialCode: row.materialCode } : {}),
      })),
    ...quoteCostsOf(form),
  };
}

// 저장해 둔 배합비 → 배합비 표 줄. 화면에서 넣은 단가가 없으면 원재료 목록의 단가를 채운다.
export function bomRowsFromQuote(bom: QuoteBomLine[] | undefined, materials: MaterialOption[], newId: () => string): BomEditRow[] {
  return (bom ?? []).map((line) => {
    const name = text(line.materialName);
    const base: BomEditRow = {
      id: newId(),
      materialName: name,
      ratioPercent: line.ratioPercent ?? null,
      unitPrice: line.unitPrice ?? null,
      autoPrice: false,
      materialCode: line.materialCode ?? null,
    };
    if (line.unitPrice != null) return base;
    const patch = materialNamePatch({ autoPrice: false }, name, materials);
    return { ...base, ...patch, materialCode: line.materialCode ?? patch.materialCode ?? null };
  });
}

// 상세 → 입력칸
export function quoteFormFrom(detail: QuoteDetail): QuoteForm {
  return {
    productName: text(detail.productName), spec: text(detail.spec), productType: text(detail.productType),
    storage: text(detail.storage), clientCode: text(detail.clientCode), note: text(detail.note),
    markupRate: text(detail.markupRate), lossRate: text(detail.lossRate),
    laborCost: text(detail.laborCost), packagingCost: text(detail.packagingCost),
    logisticsCost: text(detail.logisticsCost), margin: text(detail.margin),
    otherCost1: text(detail.otherCost1), otherCost1Note: text(detail.otherCost1Note),
    otherCost2: text(detail.otherCost2), otherCost2Note: text(detail.otherCost2Note),
    otherCost3: text(detail.otherCost3), otherCost3Note: text(detail.otherCost3Note),
    otherCost4: text(detail.otherCost4), otherCost4Note: text(detail.otherCost4Note),
    currentPrice: text(detail.currentPrice),
  };
}

// 송연 renderQuoteList: 제품명·거래처명 부분 일치(대소문자 무시)
export function filterQuotes(rows: QuoteRow[], search: string): QuoteRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => (row.productName || '').toLowerCase().includes(q) || (row.clientName || '').toLowerCase().includes(q));
}

export const quoteStatusLabel = (row: QuoteRow) =>
  row.status === 'confirmed' ? `확정됨 (${row.confirmedProductCode || '-'})` : '가견적';

// 송연 quote-excel-btn: 목록 전체(검색과 상관없이)
export const QUOTE_EXCEL_COLUMNS: ExcelColumn<QuoteRow>[] = [
  { key: 'productName', label: '제품명', width: 30 },
  { key: 'spec', label: '규격', width: 14 },
  { key: 'clientName', label: '거래처', width: 22 },
  { key: 'totalPrice', label: '제품단가', width: 12 },
  { key: (row) => (row.status === 'confirmed' ? '확정됨' : '가견적'), label: '상태', width: 10 },
];

// ===== 견적서 출력(송연 quote-print-btn) =====
// 공급자는 송연 견적서 양식 그대로
export const SUPPLIER = {
  registrationNo: '468-86-01233',
  name: '송연SY',
  ceo: '송기석',
  address: '경기도 평택시 도일동 306',
  business: '제조업 / 식품제조가공업',
};
export const QUOTE_NOTES = ['MOQ 300KG 이상', '배송거리 100KM 이내 견적', '제품변경시 단가변동', '확정 후 2년 미발주시 품목제조 삭제'];

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dotDate = (date: Date) =>
  `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}`;

// 체크한 견적으로 A4 견적서 한 장. 공급받는자 상호는 첫 번째 견적의 거래처, 유효일은 한 달 뒤, 세액은 단가의 10%(반올림).
export function buildQuoteSheetHtml(selected: QuoteRow[], today: Date, sealUrl: string): string {
  const validUntil = new Date(today);
  validUntil.setMonth(validUntil.getMonth() + 1);
  const itemRows = selected.map((q) => {
    const price = q.totalPrice || 0;
    return `<tr><td>${escapeHtml(q.productName)}</td><td>${escapeHtml(q.spec || '-')}</td>`
      + `<td style="text-align:right;">${escapeHtml(formatPrice(price))}</td>`
      + `<td style="text-align:right;">${escapeHtml(formatPrice(Math.round(price * 0.1)))}</td>`
      + `<td>${escapeHtml(q.note)}</td></tr>`;
  }).join('');
  const blankRows = Array.from({ length: Math.max(0, 10 - selected.length) })
    .map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('');
  const s = SUPPLIER;
  return `<!doctype html><html><head><meta charset="utf-8"><title>견적서</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #e8e8e8; }
  .page { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 15mm 14mm; background: #fff;
    box-shadow: 0 0 8px rgba(0,0,0,.2); font-family: 'Malgun Gothic','Apple SD Gothic Neo',sans-serif; color: #111; }
  h1 { text-align: center; font-size: 24px; letter-spacing: .5em; margin: 0 0 20px; }
  .meta-line { font-size: 13px; margin: 2px 0; }
  .info-wrap { display: flex; margin: 18px 0; border: 1px solid #333; }
  .info-col { flex: 1; }
  .info-col + .info-col { border-left: 1px solid #333; }
  .info-title { text-align: center; font-weight: 700; padding: 8px 4px; border-bottom: 1px solid #333; background: #f5f5f5; font-size: 13px; }
  .info-row { display: flex; border-bottom: 1px solid #ddd; font-size: 12.5px; }
  .info-row:last-child { border-bottom: none; }
  .info-row .lbl { width: 90px; flex-shrink: 0; padding: 6px 8px; background: #fafafa; border-right: 1px solid #ddd; font-weight: 600; }
  .info-row .val { padding: 6px 8px; flex: 1; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 14px; }
  table.items th, table.items td { border: 1px solid #333; padding: 7px 8px; font-size: 12.5px; }
  table.items th { background: #f5f5f5; text-align: center; }
  .notes { margin-top: 18px; font-size: 12px; border: 1px solid #333; padding: 10px 12px; }
  .notes b { display: block; margin-bottom: 6px; }
  .seal-area { margin-top: 24px; }
  .seal-area img { width: 230px; height: auto; display: block; }
  @page { size: A4; margin: 0; }
  @media print { .no-print { display: none; } html, body { background: #fff; }
    .page { width: auto; min-height: auto; margin: 0; padding: 15mm 14mm; box-shadow: none; } }
</style></head><body>
<div class="page">
  <h1>견 적 서</h1>
  <div class="meta-line">견적년월일 : ${dotDate(today)}</div>
  <div class="meta-line">견적유효년월일 : ${dotDate(validUntil)}</div>
  <div class="info-wrap">
    <div class="info-col">
      <div class="info-title">공급받는자</div>
      <div class="info-row"><div class="lbl">등록번호</div><div class="val"></div></div>
      <div class="info-row"><div class="lbl">상　　호</div><div class="val">${escapeHtml(selected[0]?.clientName)}</div></div>
      <div class="info-row"><div class="lbl">주　　소</div><div class="val"></div></div>
      <div class="info-row"><div class="lbl">업태/종목</div><div class="val"></div></div>
    </div>
    <div class="info-col">
      <div class="info-title">공급자</div>
      <div class="info-row"><div class="lbl">등록번호</div><div class="val">${s.registrationNo}</div></div>
      <div class="info-row"><div class="lbl">상　　호</div><div class="val">${s.name}&nbsp;&nbsp;&nbsp;&nbsp;성명 ${s.ceo}</div></div>
      <div class="info-row"><div class="lbl">주　　소</div><div class="val">${s.address}</div></div>
      <div class="info-row"><div class="lbl">업태/종목</div><div class="val">${s.business}</div></div>
    </div>
  </div>
  <table class="items">
    <thead><tr><th style="width:30%;">품목</th><th style="width:18%;">규격</th><th style="width:18%;">단가</th><th style="width:18%;">세액(원)</th><th style="width:16%;">비고</th></tr></thead>
    <tbody>${itemRows}${blankRows}</tbody>
  </table>
  <div class="notes"><b>특이사항 :</b>${QUOTE_NOTES.map((note) => `* ${note}`).join('<br/>')}</div>
  <div class="seal-area"><img src="${escapeHtml(sealUrl)}" alt="${s.name} 직인" /></div>
  <div class="no-print" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:8px 20px;font-size:13px;">인쇄하기</button>
  </div>
</div>
</body></html>`;
}
