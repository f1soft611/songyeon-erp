import JsBarcode from 'jsbarcode';
import type { LabelCell, LabelCompanyInfo, LabelFormat, LabelInfo, LabelMark, LabelRecycle } from './label.types';

// 라벨 한 장의 HTML(송연 shared/utils/labelHtml.ts, 기존 07-label.js 의 날짜 계산 · LABEL_CSS · LABEL_FORMAT_BASIC · buildLabelHTML 그대로).
// 미리보기와 실제 인쇄가 똑같아야 하므로 둘 다 이 파일의 CSS + HTML 만 쓴다.
// 크기 단위를 mm 로 적어서 화면에서 보이는 크기가 곧 인쇄 크기가 된다.
// 양식(DB 의 JSON)은 항목 이름을 snake_case(food_type)로 적어 두었고, 서버 응답은 camelCase(foodType)라 읽을 때 바꿔 찾는다.

const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

// ===== 날짜 계산 =====
export function labelPrintDateKr(dateStr: string | null | undefined) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${m}월 ${d}일`;
}

// 소비기한 = 제조일 + 기간 - 1일. 년·월은 개월수로 바꿔 계산하고, 그 달에 그 날짜가 없으면 그 달 마지막 날로 맞춘다.
export function labelPrintExpiryStr(mfgDateStr: string, value: number | string, unit: string | null | undefined) {
  if (!mfgDateStr || !value) return '';
  const u = unit || '월';
  let d = new Date(`${mfgDateStr}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (u === '일') {
    d.setDate(d.getDate() + parseInt(String(value), 10) - 1);
    return `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일`;
  }
  const months = u === '년' ? parseInt(String(value), 10) * 12 : parseInt(String(value), 10);
  d.setDate(d.getDate() - 1);
  const targetMonthIndex = d.getMonth() + months;
  const originalDay = d.getDate();
  const targetYear = d.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  d = new Date(targetYear, normalizedMonth, Math.min(originalDay, lastDayOfTargetMonth));
  return `${d.getFullYear()}년 ${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일`;
}

// 라벨에는 "2027년 02월 27일(제조일로부터 6개월)" 처럼 실제 날짜와 기간을 함께 찍는다.
export function labelShelfLifeText(mfgDateStr: string, value: number | string | null | undefined, unit: string | null | undefined) {
  if (!value) return '';
  const u = unit === '월' ? '개월' : (unit || '개월');
  const period = `제조일로부터 ${value}${u}`;
  const real = labelPrintExpiryStr(mfgDateStr, value, unit);
  return real ? `${real}(${period})` : period;
}

// ===== 라벨 모양 =====
// 이 CSS 는 앱 화면 안(미리보기)과 인쇄창 양쪽에서 쓴다. 미리보기에는 앱 CSS 가 함께 걸리므로
// 거기서 흘러드는 규칙(td 의 nowrap·고정폭 글꼴·줄 호버색 등)을 여기서 반드시 되돌려 놓는다.
// 바깥 테두리와 고정 높이는 두지 않는다(표의 칸 선만 그려 '실제 적히는 부분'만 인쇄). 폭은 buildLabelHTML 이 적는다.
export const LABEL_CSS = `
.lbl{ background:#fff; color:#000; box-sizing:border-box;
      font-family:'Malgun Gothic','맑은 고딕',sans-serif; }
.lbl *{ box-sizing:border-box; }
.lbl td.lbl-title{ text-align:center; font-weight:800; font-size:15pt; letter-spacing:-0.02em;
                   padding:2.2mm 1mm; color:#000; }
.lbl td.haccp-space{ background:#fff; height:25mm; padding:0; }
.lbl th.narrow{ font-size:7pt; letter-spacing:-0.03em; }
.lbl table{ width:100%; border-collapse:collapse; table-layout:fixed; border:none; margin:0; background:#fff; }
.lbl th,.lbl td{
  border:0.3mm solid #000; padding:1.1mm 1.2mm; font-size:8pt;
  line-height:1.35; vertical-align:middle; text-align:center;
  white-space:normal; word-break:break-all; overflow-wrap:anywhere;
  font-family:'Malgun Gothic','맑은 고딕',sans-serif;
  color:#000; background:#fff;
}
.lbl th{ font-weight:700; }
.lbl tr{ cursor:default; }
.lbl tr:hover td, .lbl tr:hover th{ background:#fff; }
.lbl td.expiry{ font-size:7.2pt; letter-spacing:-0.02em; }
.lbl td.ing{ text-align:left; font-size:7.5pt; line-height:1.45; padding:1.5mm 1.4mm; }
.lbl td.notice{ text-align:left; font-size:6.8pt; line-height:1.5; position:relative; padding-right:14mm; }
.lbl .recycle{ position:absolute; right:1.2mm; bottom:1.2mm; line-height:0; }
.lbl .recycle .rc-img{ display:block; height:auto; }
`;

// 원재료명은 굵게·크기 서식이 든 HTML 이다. 스크립트나 클릭 동작이 섞여 들어가지 않도록 걸러낸다.
export function sanitizeLabelHtml(html: string | null | undefined) {
  const box = document.createElement('div');
  box.innerHTML = html || '';
  box.querySelectorAll('script,style,iframe,object,embed,link').forEach((node) => node.remove());
  box.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attribute) => {
      const keep = attribute.name === 'style' || attribute.name === 'class';
      if (!keep || /expression|javascript:/i.test(attribute.value)) el.removeAttribute(attribute.name);
    });
  });
  return box.innerHTML;
}

export function esc(value: unknown) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 제품명이 길어 두 줄로 넘어가면 해썹 마크 자리(25mm)도 함께 커진다. 이름 길이에 맞춰 글자를 줄여 한 줄에 넣는다.
function labelTitleFontPt(name: string, cellWidthMm: number) {
  const usableMm = (cellWidthMm || 75) - 2;
  const len = (name || '').length || 1;
  for (const pt of [15, 13.5, 12, 10.5, 9.5, 8.5]) {
    if (len * pt * 0.353 <= usableMm) return pt; // 1pt = 0.353mm, 한글 한 글자 폭 ≈ 글자크기
  }
  return 8;
}

// 분리배출마크는 라벨지에 없어서 우리가 찍는다. 그림을 주소가 아니라 내용(data URL)으로 넣어,
// 그림을 다 받기 전에 인쇄가 시작돼 빈 채로 찍히는 일을 막는다.
function labelRecycleHTML(cfg: LabelRecycle | null | undefined, marks: LabelMark[]) {
  if (!cfg || !cfg.mark_id) return '';
  const mark = marks.find((m) => String(m.id) === String(cfg.mark_id));
  if (!mark) return '';
  const w = cfg.width_mm || mark.widthMm || 9;
  return `<span class="recycle"><img class="rc-img" src="${esc(mark.dataUrl)}" alt="" style="width:${w}mm;"></span>`;
}

// 바코드는 그림이 아니라 SVG 로 만들어 라벨 HTML 안에 넣는다. 인쇄창에서 라이브러리를 따로 부르지 않아도 된다.
function labelBarcodeSVG(code: string | null | undefined, widthMm: number) {
  if (!code) return '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, String(code), { format: 'CODE128', width: 1.2, height: 34, fontSize: 11, margin: 0 });
  } catch {
    return esc(code);
  }
  svg.setAttribute('style', `width:${Math.max(widthMm - 3, 10)}mm;height:auto;display:block;margin:0 auto;`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return svg.outerHTML;
}

// ===== 기본 양식(100×150) =====
// 칸 경계: 0 · 22 · 56 · 75 · 77 · 87 · 100 (mm). 라벨지 우측 위 25×25mm 는 해썹 마크가 미리 인쇄된 자리라 비워둔다.
export const LABEL_FORMAT_BASIC: LabelFormat = {
  name: '기본 (100×150)',
  paper: { w: 100, h: 150 },
  cols: [22, 34, 19, 2, 10, 13],
  rows: [
    { cells: [{ type: 'title', span: 3 }, { type: 'blank', span: 3, rowspan: 3, cls: 'haccp-space' }] },
    { cells: [{ type: 'label', span: 1, text: '식품유형' }, { type: 'field', span: 2, field: 'food_type' }] },
    { cells: [{ type: 'label', span: 1, text: '제조년월일' }, { type: 'date', span: 2 }] },
    { cells: [
      { type: 'label', span: 1, text: '소비기한' }, { type: 'expiry', span: 2, cls: 'expiry' },
      { type: 'label', span: 2, text: '내용량' }, { type: 'field', span: 1, field: 'net_weight' },
    ] },
    { cells: [{ type: 'label', span: 1, text: '원재료명\n및 함량', cls: 'narrow' }, { type: 'html', span: 5, field: 'ingredients_text', cls: 'ing' }] },
    { cells: [{ type: 'label', span: 1, text: '알러지유발원재료', cls: 'narrow' }, { type: 'field', span: 5, field: 'allergens' }] },
    { cells: [{ type: 'label', span: 1, text: '품목제조보고번호', cls: 'narrow' }, { type: 'field', span: 5, field: 'manufacture_report_no' }] },
    { cells: [
      { type: 'label', span: 1, text: '보관방법' }, { type: 'field', span: 1, field: 'storage' },
      { type: 'label', span: 2, text: '포장재질(내면)', cls: 'narrow' }, { type: 'field', span: 2, field: 'packaging_material' },
    ] },
    { cells: [
      { type: 'label', span: 1, text: '반품 및 교환', cls: 'narrow' }, { type: 'company', span: 1, key: 'return_exchange_location' },
      { type: 'label', span: 2, text: '고객상담실', cls: 'narrow' }, { type: 'company', span: 2, key: 'customer_service_phone' },
    ] },
    { cells: [{ type: 'label', span: 1, text: '영업소의명칭\n및소재지', cls: 'narrow' }, { type: 'company', span: 5, key: 'address' }] },
    { cells: [{ type: 'label', span: 1, text: '주의\n사항', cls: 'narrow' }, { type: 'notice', span: 5, cls: 'notice', recycle: true }] },
  ],
};

// 라벨에 늘 들어가는 항목(양식에 적는 이름). 이 목록에 없는 항목(예: 유통전문판매원)은 양식마다 달라 extra 에 따로 모은다.
export const LABEL_STD_FIELDS: Record<string, string> = {
  food_type: '식품유형',
  net_weight: '내용량',
  ingredients_text: '원재료명 및 함량',
  allergens: '알러지유발원재료',
  manufacture_report_no: '품목제조보고번호',
  packaging_material: '포장재질(내면)',
  storage: '보관방법',
};

// 라벨 한 장을 그리는 데 드는 것
export interface LabelSheet {
  code: string | null;
  name: string;
  mfgDate: string;
  info: LabelInfo;
  companyInfo: LabelCompanyInfo;
  format: LabelFormat | null;
  recycle: LabelRecycle | null;
  marks: LabelMark[];
}

function labelFieldValue(sheet: LabelSheet, field: string | undefined) {
  if (!field) return '';
  if (field in LABEL_STD_FIELDS) return (sheet.info as Record<string, unknown>)[camel(field)];
  return (sheet.info.extra || {})[field] || '';
}

function labelCellWidthMm(format: LabelFormat, colIndex: number, span: number | undefined) {
  let w = 0;
  for (let i = colIndex; i < colIndex + (span || 1) && i < format.cols.length; i++) w += format.cols[i];
  return w;
}

function labelCellHTML(cell: LabelCell, sheet: LabelSheet, format: LabelFormat, colIndex: number) {
  const info = sheet.info || {};
  const company = (sheet.companyInfo || {}) as Record<string, string | null | undefined>;
  const isHead = cell.type === 'label';
  const cls = [cell.cls].filter(Boolean) as string[];
  const style: string[] = [];
  let inner = '';
  switch (cell.type) {
    case 'title':
      cls.push('lbl-title');
      style.push(`font-size:${labelTitleFontPt(sheet.name, labelCellWidthMm(format, colIndex, cell.span))}pt`);
      inner = esc(sheet.name);
      break;
    case 'label':
      inner = esc(cell.text || '').split('\n').join('<br>');
      break;
    case 'field':
      inner = esc(labelFieldValue(sheet, cell.field));
      break;
    case 'date':
      inner = esc(labelPrintDateKr(sheet.mfgDate));
      break;
    case 'expiry':
      inner = esc(labelShelfLifeText(sheet.mfgDate, info.shelfLifeMonths, info.shelfLifeUnit));
      break;
    case 'html':
      inner = sanitizeLabelHtml((info as Record<string, string | null | undefined>)[camel(cell.field || '')]);
      break;
    case 'company':
      inner = cell.key === 'address'
        ? [company.businessName, company.businessAddress].filter(Boolean).map(esc).join('<br>')
        : esc(company[camel(cell.key || '')]);
      break;
    case 'notice':
      inner = esc(company.noticeText || '').split('\n').join('<br>');
      if (cell.recycle) inner += labelRecycleHTML(sheet.recycle, sheet.marks);
      break;
    case 'barcode':
      inner = labelBarcodeSVG(sheet.code, labelCellWidthMm(format, colIndex, cell.span));
      break;
    default:
      inner = '';
  }
  // 양식 편집기에서 지정한 글자크기·정렬. 없으면 CSS 기본값.
  if (cell.size) style.push(`font-size:${cell.size}pt`);
  if (cell.align) style.push(`text-align:${cell.align}`);
  const tag = isHead ? 'th' : 'td';
  const attrs = [
    (cell.span ?? 1) > 1 ? `colspan="${cell.span}"` : '',
    (cell.rowspan ?? 1) > 1 ? `rowspan="${cell.rowspan}"` : '',
    cls.length ? `class="${cls.join(' ')}"` : '',
    style.length ? `style="${style.join(';')}"` : '',
  ].filter(Boolean).join(' ');
  return `<${tag}${attrs ? ` ${attrs}` : ''}>${inner}</${tag}>`;
}

// 라벨 한 장의 HTML. 미리보기와 인쇄가 이 함수를 함께 쓴다.
export function buildLabelHTML(sheet: LabelSheet) {
  const format = sheet.format || LABEL_FORMAT_BASIC;
  const colgroup = format.cols.map((w) => `<col style="width:${w}mm">`).join('');
  const rows = format.rows.map((row) => {
    let col = 0;
    const cells = row.cells.map((cell) => {
      const html = labelCellHTML(cell, sheet, format, col);
      col += cell.span || 1;
      return html;
    }).join('');
    const h = row.h ? ` style="height:${row.h}mm"` : '';
    return `<tr${h}>${cells}</tr>`;
  }).join('');
  return `<div class="lbl" style="width:${format.paper.w}mm;"><table><colgroup>${colgroup}</colgroup>${rows}</table></div>`;
}

// 인쇄창 HTML: 라벨 한 장만 넣고 열리면 인쇄 대화상자를 연다.
// 제목을 비워 둔다 — 브라우저가 인쇄물 머리글에 문서 제목(제품명)을 찍는 것을 막는다.
export function buildLabelPrintDocument(sheet: LabelSheet, size: string) {
  const [w, h] = (size || '100x150').split('x');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
<title> </title>
<style>
@page{ size:${w}mm ${h}mm; margin:0; }
html,body{ margin:0; padding:0; background:#fff; }
${LABEL_CSS}
</style></head><body>${buildLabelHTML(sheet)}
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},250);});<\/script>
</body></html>`;
}

// 바코드 한 줄(라벨출력 목록의 제품코드). 표현할 수 없는 코드면 빈 칸.
export function barcodeSvgMarkup(code: string, options: { width: number; height: number; fontSize: number }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, code, { format: 'CODE128', margin: 0, ...options });
  } catch {
    return '';
  }
  return svg.outerHTML;
}

// 라벨 창에서 아직 비어 있는 항목(인쇄 전에 알려준다)
export function missingLabelItems(info: LabelInfo, company: LabelCompanyInfo) {
  const missing: string[] = [];
  if (!info.foodType) missing.push('식품유형');
  if (!info.netWeight) missing.push('내용량');
  if (!info.shelfLifeMonths) missing.push('소비기한');
  if (!(info.ingredientsText || '').replace(/<[^>]*>/g, '').trim()) missing.push('원재료명');
  if (!info.manufactureReportNo) missing.push('품목제조보고번호');
  if (!info.storage) missing.push('보관방법');
  if (!info.packagingMaterial) missing.push('포장재질');
  if (!company.businessName) missing.push('영업소 명칭(회사 고정정보)');
  return missing;
}
