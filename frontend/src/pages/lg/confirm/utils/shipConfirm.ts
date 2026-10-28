import type { ExcelColumn } from '../../../../shared/utils/excelFile';
import { parseQtyNumber } from '../../../sa/order/utils/salesOrder';

// 물류관리 > 출하확정 규칙 (송연 LG0002, 기존 21-logistics.js)
// 출하 목록은 두 곳에서 온다: manual — 출하등록에서 넣은 줄, production — 물류출고일이 적힌 생산확정 줄(그 줄 자신이 로트)
export type ShipSource = 'manual' | 'production';

export type LotAllocation = { qty: number | null; lotNo: string; lotDate: string };

export type ShipRecord = {
  id: number;
  source: ShipSource;
  scheduleDate?: string | null;
  clientName?: string | null;
  productName?: string | null;
  orderQty?: string | null; // 실출하량이 있으면 그것, 없으면 예정량
  plannedQty?: string | null; // 출하예정량
  actualQty?: string | null; // 실출하량
  shipNote?: string | null; // 특이사항
  lotId?: number | null;
  vehicle?: string | null; // 배차
  packingMethod?: string | null;
  visitOrder?: number | null; // 순서
  driverName?: string | null; // 운행자
  charterInfo?: string | null;
  charterAmount?: number | null;
  shipConfirmed?: number | null;
  boxQty?: number | null;
  lotDate?: string | null; // 제조일자(생산일)
  lotNo?: string | null;
  lotActualQty?: string | null; // 그 로트의 실생산량(없으면 아직 생산입고 전)
  lotPlannedQty?: string | null;
  lotAllocations?: LotAllocation[];
  storage?: string | null;
  stockQty?: number | null; // 지금 재고
};

// 줄에서 고치는 칸(확정할 때 보낸다)
export type ShipInputs = {
  inputActual: string;
  inputBox: string;
  inputPacking: string;
  inputDriver: string;
  inputVehicle: string;
  inputOrder: string;
  inputCharterInfo: string;
  inputCharterAmount: string;
  inputNote: string;
};

// 표의 한 줄 = 서버 값 + 고치는 칸 + 화면 값
export type ShipRow = ShipRecord & ShipInputs & { key: string; lotText: string; vehicleGroup: string };

export type CharterRow = { scheduleDate?: string | null; charterInfo?: string | null; charterAmount?: number | null };
export type CharterSummary = { rows: CharterRow[]; totalAmount: number };

export const rowKey = (row: { source: ShipSource; id: number }) => `${row.source}:${row.id}`;
export const isConfirmed = (row: ShipRecord) => Boolean(row.shipConfirmed);

// 송연 formatQty: 소수 둘째 자리까지
export const formatQty = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

// 송연 formatPrice: 소수 넷째 자리까지
export const formatPrice = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? '' : (Math.round(value * 10000) / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 4 });

// 실출하량 칸에 미리 채워둘 수량(송연 suggestShipQty). 재고는 '실출하량' 으로 빠지므로 이 칸은 제안일 뿐 고칠 수 있다.
//   ① 예정량과 다른 실출하량이 적혀 있으면 그대로 — 사람이 정한 숫자는 안 덮는다
//   ② 생산입고가 잡혔고 만든 양이 예정보다 적으면 만든 만큼(1000 예정 / 950 생산 → 950)
//   ③ 그 외에는 출하예정량
// ①에서 예정량과 같은 값은 정한 값으로 안 친다. 출하등록에서 저장하면 예정량이 실출하량 칸에도 그대로 들어가기 때문이다.
export function suggestShipQty(row: ShipRecord) {
  const planned = parseQtyNumber(row.plannedQty || '');
  const made = parseQtyNumber(row.lotActualQty || '');
  const decided = row.actualQty && parseQtyNumber(row.actualQty) !== planned;
  if (decided) return String(row.actualQty);
  if (made && planned && made < planned) return String(row.lotActualQty);
  return String(row.plannedQty || '');
}

const lotLabel = (lotNo: string | null | undefined, lotDate: string | null | undefined) => lotNo || lotDate || '';

// 출하 한 줄의 로트를 한 줄 글로(송연 shipLotText). 나뉘어 있으면 로트마다 수량까지 — 회수 때 이 글을 그대로 읽는다.
export function shipLotText(row: ShipRecord) {
  const allocations = row.lotAllocations || [];
  if (allocations.length > 1) return allocations.map((a) => `${lotLabel(a.lotNo, a.lotDate)} ${formatQty(a.qty)}`).join(' · ');
  if (allocations.length === 1) return lotLabel(allocations[0].lotNo, allocations[0].lotDate);
  return lotLabel(row.lotNo, row.lotDate);
}

export function toShipRow(record: ShipRecord): ShipRow {
  return {
    ...record,
    key: rowKey(record),
    lotText: shipLotText(record),
    vehicleGroup: record.vehicle || '(배차 미지정)',
    inputActual: suggestShipQty(record),
    inputBox: record.boxQty == null ? '' : String(record.boxQty),
    inputPacking: record.packingMethod || '',
    inputDriver: record.driverName || '',
    inputVehicle: record.vehicle || '',
    inputOrder: record.visitOrder == null ? '' : String(record.visitOrder),
    inputCharterInfo: record.charterInfo || '',
    inputCharterAmount: record.charterAmount == null ? '' : String(record.charterAmount),
    inputNote: record.shipNote || '',
  };
}

// 칸마다 넣을 수 있는 글자(송연과 같음): 순서·박스는 숫자, 용차금액은 숫자와 점, 실출하량은 숫자·점·kg
export const onlyDigits = (value: unknown) => String(value ?? '').replace(/[^0-9]/g, '');
export const onlyDecimal = (value: unknown) => String(value ?? '').replace(/[^0-9.]/g, '');
export const onlyQty = (value: unknown) => String(value ?? '').replace(/[^0-9.kgKG]/g, '');
// 실출하량이 0 보다 큰 숫자인지(숫자 칸은 비우거나 글자만 치면 0 이 된다)
export const hasShipQty = (value: unknown): boolean => (parseFloat(onlyQty(value)) || 0) > 0;

// 목록에 없는 값이 저장돼 있어도 고른 것처럼 보내지 않는다(송연 select 와 같음)
export const pickListed = (value: string, names: string[]) => (names.includes(value) ? value : '');

// 확정 요청 본문
// 표의 글자 칸은 친 그대로 들어오므로 보낼 때 칸마다 거른다(화면에도 거른 값을 보여준다)
export function toConfirmBody(row: ShipRow, packingNames: string[], vehicleNames: string[]) {
  return {
    actualQty: onlyQty(row.inputActual).trim(),
    boxQty: onlyDecimal(row.inputBox) || null, // 2026-10-26 입력한 그대로(예전에는 4.7 이 47 이 됐다)
    vehicle: pickListed(row.inputVehicle, vehicleNames).trim(),
    driverName: row.inputDriver.trim(),
    packingMethod: pickListed(row.inputPacking, packingNames),
    note: row.inputNote.trim(),
    visitOrder: onlyDigits(row.inputOrder) || null,
    charterInfo: row.inputCharterInfo.trim(),
    charterAmount: onlyDecimal(row.inputCharterAmount) || null,
  };
}

// 🚚 배차·순서로 정렬: 배차 이름 순(배차 미지정은 맨 뒤), 같은 배차 안에서는 순서(없으면 뒤)
export function sortByVehicle<T extends ShipRecord>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const va = a.vehicle || '';
    const vb = b.vehicle || '';
    if (!va && vb) return 1;
    if (va && !vb) return -1;
    if (va !== vb) return va.localeCompare(vb, 'ko');
    return (a.visitOrder ?? 9999) - (b.visitOrder ?? 9999);
  });
}

// 확정하면 재고가 마이너스가 되는지(송연 확정 단추). '창고에 있는 것보다 많이 내보내나' 로 따진다.
//   지금 재고 + 이 로트에서 자동으로 잡힐 입고 - 실출하량 < 0
// 마이너스가 되면 물어볼 글을, 아니면 null
export function negativeStockMessage(row: ShipRecord, actualQty: string) {
  if (row.stockQty === null || row.stockQty === undefined) return null;
  const out = parseQtyNumber(actualQty);
  const stock = Number(row.stockQty) || 0;
  // 생산입고가 아직 안 잡힌 로트는 확정할 때 계획수량 한도 안에서 자동으로 잡힌다
  const willReceive = row.lotActualQty ? 0 : Math.min(out, parseQtyNumber(row.lotPlannedQty || '') || out);
  const after = stock + willReceive - out;
  if (after >= 0) return null;
  const lines = [`확정하면 재고가 ${formatQty(after)} 이 됩니다.`, '', `지금 재고: ${formatQty(stock)}`];
  if (willReceive) lines.push(`이 로트 자동입고: +${formatQty(willReceive)}`);
  lines.push(`실출하량: -${formatQty(out)}`, '', '실제로 더 만드셨다면 생산입고에서 실생산량을 먼저 고쳐주세요.', '이대로 확정할까요?');
  return lines.join('\n');
}

// 송연 엑셀 칸
export const SHIP_EXCEL_COLUMNS: ExcelColumn<ShipRow>[] = [
  { key: 'clientName', label: '거래처', width: 20 },
  { key: 'productName', label: '품목명', width: 28 },
  { key: 'storage', label: '보관방법', width: 14 },
  { key: 'plannedQty', label: '출하예정량', width: 12 },
  { key: (row) => row.actualQty || '', label: '실출하량', width: 12 },
  { key: 'lotText', label: '로트번호', width: 18 },
  { key: 'lotDate', label: '제조일자', width: 12 },
  { key: 'packingMethod', label: '포장방법', width: 12 },
  { key: 'driverName', label: '운행자', width: 10 },
  { key: 'vehicle', label: '배차', width: 10 },
  { key: 'visitOrder', label: '순서', width: 8 },
  { key: 'charterInfo', label: '용차정보', width: 14 },
  { key: 'charterAmount', label: '용차금액', width: 12 },
  { key: 'shipNote', label: '특이사항', width: 20 },
  { key: (row) => (isConfirmed(row) ? '확정됨' : '미확정'), label: '상태', width: 8 },
];

// ===== 인쇄 =====
const escapeText = (value: unknown) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function splitNameSpec(productName: string | null | undefined) {
  const m = (productName || '').match(/^(.*?)\(([^)]+)\)\s*$/);
  return m ? { name: m[1].trim(), spec: m[2].trim() } : { name: productName || '', spec: '' };
}

function formatLotDate(lotDate: string | null | undefined) {
  if (!lotDate) return '';
  const m = String(lotDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1].slice(2)}.${m[2]}.${m[3]}` : lotDate;
}

// 📦 완제품출고일지(A4 세로, 송연 printShipmentLog). 거래처별로 묶는다(같은 거래처는 떨어져 있어도 하나로).
export function buildShipmentLogHtml(rows: ShipRecord[], dateValue: string) {
  const d = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateStr = dateValue ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${weekdays[d.getDay()]}요일` : '';
  const groups: { client: string; rows: ShipRecord[] }[] = [];
  const index: Record<string, number> = {};
  rows.forEach((row) => {
    const key = row.clientName || '';
    if (!(key in index)) {
      index[key] = groups.length;
      groups.push({ client: key, rows: [] });
    }
    groups[index[key]].rows.push(row);
  });
  let bodyRows = '';
  groups.forEach((group) => group.rows.forEach((row, i) => {
    const ns = splitNameSpec(row.productName);
    bodyRows += '<tr>';
    if (i === 0) bodyRows += `<td rowspan="${group.rows.length}" class="txt-left" style="vertical-align:middle;">${escapeText(group.client)}</td>`;
    bodyRows += `
        <td class="txt-left">${escapeText(ns.name)}</td>
        <td class="qty-cell">${escapeText(row.orderQty)}</td>
        <td>${escapeText(ns.spec)}</td>
        <td>${escapeText(shipLotText(row) || formatLotDate(row.lotDate))}</td>
        <td>${escapeText(row.vehicle)}</td>
        <td class="txt-left" style="white-space:pre-line;">${escapeText(row.shipNote)}</td>
      </tr>`;
  }));
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>완제품출고일지</title>
    <style>
      * { box-sizing: border-box; }
      html, body{ margin:0; padding:0; background:#e8e8e8; }
      .page{ width:210mm; min-height:297mm; margin:16px auto; padding:12mm 12mm; background:#fff; box-shadow:0 0 8px rgba(0,0,0,.2);
        font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; color:#111; }
      table.top{ width:100%; border-collapse:collapse; margin-bottom:0; }
      table.top td{ border:1px solid #333; padding:8px; vertical-align:middle; }
      table.top .title-cell{ font-size:22px; font-weight:800; }
      table.top .approve-head{ text-align:center; font-weight:700; font-size:13px; padding:10px 4px; }
      table.top .approve-box{ height:50px; }
      table.date{ width:100%; border-collapse:collapse; }
      table.date td{ border:1px solid #333; padding:6px 10px; font-size:12.5px; }
      table.date .lbl{ font-weight:700; width:110px; }
      table.items{ width:100%; border-collapse:collapse; table-layout:fixed; }
      table.items th, table.items td{ border:1px solid #333; padding:6px 6px; font-size:12px; text-align:center; overflow:hidden; }
      table.items th{ background:#f5f5f5; font-weight:700; }
      table.items td.txt-left{ text-align:left; }
      table.items td.qty-cell{ white-space:nowrap; font-size:11.5px; padding-left:2px; padding-right:2px; }
      .footer{ text-align:center; font-weight:700; font-size:13px; margin-top:10px; border:1px solid #333; padding:8px; }
      @page{ size:A4; margin:0; }
      @media print{ .no-print{ display:none; } html, body{ background:#fff; } .page{ margin:0; box-shadow:none; } }
    </style></head>
    <body>
      <div class="page">
        <table class="top">
          <tr>
            <td class="title-cell" style="width:65%;" rowspan="2">완제품 출고 일지[송연-SY]</td>
            <td class="approve-head" style="width:11.6%;">작성</td>
            <td class="approve-head" style="width:11.6%;">검토</td>
            <td class="approve-head" style="width:11.6%;">승인</td>
          </tr>
          <tr><td class="approve-box"></td><td class="approve-box"></td><td class="approve-box"></td></tr>
        </table>
        <table class="date"><tr><td class="lbl">출고일자 :</td><td>${dateStr}</td></tr></table>
        <table class="items">
          <thead><tr><th style="width:15%;">거래처</th><th style="width:24%;">제품명</th><th style="width:9%;">납품수량</th><th style="width:10%;">규격</th><th style="width:13%;">제조년월일<br>(로트번호)</th><th style="width:10%;">차량번호</th><th style="width:19%;">비고</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <div class="footer">주식회사 송연에스와이</div>
        <button class="no-print" onclick="window.print()" style="margin-top:16px;padding:8px 20px;font-size:13px;">인쇄하기</button>
      </div>
    </body></html>`;
}

// 📋 작업지시서(A4 가로, 송연 printWorkOrder)
export function buildWorkOrderHtml(rows: ShipRecord[], dateValue: string) {
  const bodyRows = rows.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="txt-left">${escapeText(row.clientName)}</td>
      <td class="txt-left">${escapeText(row.productName)}</td>
      <td>${escapeText(row.orderQty)}</td>
      <td>${escapeText(row.packingMethod || '-')}</td>
      <td class="txt-left">${escapeText(row.shipNote)}</td>
      <td></td>
    </tr>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>작업지시서</title>
    <style>
      * { box-sizing: border-box; }
      html, body{ margin:0; padding:0; background:#e8e8e8; }
      .page{ width:297mm; min-height:210mm; margin:16px auto; padding:14mm 14mm; background:#fff; box-shadow:0 0 8px rgba(0,0,0,.2);
        font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; color:#111; }
      h1{ text-align:center; font-size:20px; letter-spacing:.3em; margin:0 0 14px; }
      .meta-line{ font-size:12.5px; margin:0 0 12px; text-align:right; }
      table.items{ width:100%; border-collapse:collapse; }
      table.items th, table.items td{ border:1px solid #333; padding:6px 8px; font-size:12px; }
      table.items th{ background:#f5f5f5; text-align:center; }
      table.items td{ text-align:center; }
      table.items td.txt-left{ text-align:left; }
      @page{ size:A4 landscape; margin:0; }
      @media print{ .no-print{ display:none; } html, body{ background:#fff; } .page{ margin:0; box-shadow:none; } }
    </style></head>
    <body>
      <div class="page">
        <h1>작업지시서</h1>
        <div class="meta-line">지시일자: ${escapeText(dateValue)}</div>
        <table class="items">
          <thead><tr><th>순서</th><th>거래처</th><th>품목명(규격)</th><th>지시수량</th><th>포장방법</th><th>특이사항</th><th>담당자 확인</th></tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:8px 20px;font-size:13px;">인쇄하기</button>
      </div>
    </body></html>`;
}
