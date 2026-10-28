import type { BoxTypeRow, BoxTypeUseFilter } from '../types/boxType.types';

// 조회 조건: 포장유형명(포함) + 사용여부(코드 칸은 2026-10-22 뺐다). 서버에서 다 받아 화면에서 거른다
export function filterBoxTypeRows(rows: BoxTypeRow[], search: string, useFilter: BoxTypeUseFilter): BoxTypeRow[] {
  const query = search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (useFilter === 'ALL' || row.useYn === useFilter) &&
      (!query || row.boxTypeNm.toLowerCase().includes(query)),
  );
}

// 숫자를 소수 자리에 맞춰 천 단위 쉼표로 보인다(빈 값은 빈 칸). 제품BOM 편집 표도 같이 쓴다
export const formatOptionalNumber = (value: unknown, decimalPlaces: number): string => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString('ko-KR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};
