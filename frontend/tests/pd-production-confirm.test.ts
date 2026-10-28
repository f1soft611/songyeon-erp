import { describe, expect, it } from 'vitest';

import {
  buildBatchSheetHtml,
  fromSaved,
  importRange,
  rowFromOrder,
  saveBodyOf,
  SCHEDULE_EXCEL_COLUMNS,
  scheduleSummary,
} from '../src/pages/pd/confirm/utils/productionConfirm';

describe('생산확정 utils(송연 PD0001)', () => {
  it('저장된 줄은 잠기고, 가져온 수주는 확정 전 줄(생산예정일·수주번호·재고생산 표시)', () => {
    expect(fromSaved({ id: 2, scheduleDate: '2026-09-21', productName: 'P', orderQty: '1000', isStockProduction: 0, substitutionCount: 2 }, 1))
      .toMatchObject({ key: 1, id: 2, locked: true, scheduleDate: '2026-09-21', isStockProduction: false, substitutionCount: 2, clientName: '' });
    const row = rowFromOrder({ id: 7, productionDate: '2026-10-06', clientName: '(주)달구지푸드', productName: '로제파스타소스(5kg*4ea)', orderQty: '135', isStockProduction: 1 }, 5);
    expect(row).toMatchObject({ key: 5, locked: false, sourceOrderId: 7, scheduleDate: '2026-10-06', isStockProduction: true });
    expect(row.id).toBeUndefined();
  });

  it('저장 본문: 생산일자가 비면 조회 날짜, 글자는 다듬고 재고생산은 1/0', () => {
    const row = { ...rowFromOrder({ id: 7, productName: ' P ', orderQty: ' 135 ', isStockProduction: 1 }, 1), scheduleDate: '' };
    expect(saveBodyOf(row, '2026-10-06')).toEqual({
      scheduleDate: '2026-10-06', clientName: '', productName: 'P', orderQty: '135', note: '', logisticsDate: null, sourceOrderId: 7, isStockProduction: 1,
    });
  });

  it('합계는 보이는 줄로(확정 전 포함), 가져오기 기간은 3일 전 ~ 7일 뒤, 엑셀 칸', () => {
    expect(scheduleSummary([{ orderQty: '1,000kg' }, { orderQty: '135' }])).toEqual({ count: 2, total: 1135 });
    expect(importRange('2026-10-06')).toEqual({ start: '2026-10-03', end: '2026-10-13' });
    expect(importRange('')).toEqual({ start: '', end: '' });
    expect(SCHEDULE_EXCEL_COLUMNS.map((c) => c.label)).toEqual(['거래처', '품목명', '생산지시량', '실생산량', '비고', '물류출고일']);
  });

  it('투입지시서: 머리·원재료 kg·합계·서명칸, 바꿔 쓴 원재료는 원래 이름과 사유, 입력값은 HTML 로 해석하지 않는다', () => {
    const html = buildBatchSheetHtml({
      header: { id: 2, productName: '국물<b>', clientName: '(주)A&B', scheduleDate: '2026-09-21', orderQty: '1000', lotNo: '20260921-01', note: null, substitutionCount: 1 },
      rows: [
        { materialName: 'MSG', originName: 'MSG', qty: 59.9, substituted: false },
        { materialName: '고춧가루(국산)', originName: '고춧가루', qty: 27, substituted: true, reason: '산지 변경' },
      ],
    }, new Date(2026, 9, 6));
    expect(html).toContain('생 산 투 입 지 시 서');
    expect(html).toContain('국물&lt;b&gt;');
    expect(html).toContain('(주)A&amp;B');
    expect(html).toContain('20260921-01');
    expect(html).toContain('원래: 고춧가루 → 바꿔 씀 · 산지 변경');
    expect(html).toContain('>86.9<');
    expect(html).toContain('계량자');
    expect(html).toContain('출력일 2026. 10. 06');
    expect(html).toContain('제품BOM은 바뀌지 않았습니다');
    expect(html).not.toContain('배합비율');
  });
});
