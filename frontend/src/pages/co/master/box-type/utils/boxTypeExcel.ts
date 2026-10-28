import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { BoxTypeRow } from '../types/boxType.types';

// 포장유형 엑셀 다운로드 칸(화면 그리드와 같은 차례, 그리드에서 뺀 코드 · 마진(원)은 넣지 않는다). 비율은 % 숫자 그대로, 금액은 원
export const BOX_TYPE_EXCEL_COLUMNS: ExcelColumn<BoxTypeRow>[] = [
  { key: 'boxTypeNm', label: '포장유형', width: 24 },
  { key: 'fixedMarginRate', label: '고정마진율(%)', width: 14 },
  { key: 'lossRate', label: '로스율(%)', width: 12 },
  { key: 'laborCost', label: '인건비(원)', width: 12 },
  { key: 'packingCost', label: '포장비(원)', width: 12 },
  { key: 'logisticsCost', label: '물류비(원)', width: 12 },
  { key: (row) => (row.useYn === 'N' ? '사용안함' : '사용중'), label: '사용여부', width: 10 },
  { key: 'regUserNm', label: '등록자', width: 12 },
  { key: 'regDt', label: '등록일시', width: 20 },
  { key: 'updUserNm', label: '수정자', width: 12 },
  { key: 'updDt', label: '수정일시', width: 20 },
];
