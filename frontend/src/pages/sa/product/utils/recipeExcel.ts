// 송연 handleBomFile: 레시피 엑셀에서 원재료 배합비를 읽는다(제품등록의 끌어다 놓기).
// 배합비율은 화면 칸처럼 소수 셋째 자리까지(송연은 둘째 자리였다. 2026-10-06 배합비율 셋째 자리 요청에 맞춤).

export type RecipeLine = { materialName: string; ratioPercent: number };

const text = (value: unknown) => (value ?? '').toString().trim();
const number = (value: unknown) => parseFloat(String(value));
const round3 = (value: number) => Number(value.toFixed(3));

export function parseRecipeRows(rows: unknown[][]): RecipeLine[] {
  // 1) "품목" 머리칸을 찾아 원재료명 칸 위치를 정한다(송연 레시피 양식 기준)
  let headerRow = -1;
  let nameCol = -1;
  for (let i = 0; i < rows.length && headerRow < 0; i += 1) {
    const row = rows[i] || [];
    for (let j = 0; j < row.length; j += 1) {
      if (text(row[j]) === '품목') {
        headerRow = i;
        nameCol = j;
        break;
      }
    }
  }

  const lines: RecipeLine[] = [];
  if (headerRow >= 0) {
    // 원재료 줄: 머리줄 다음 ~ "합계" 가 나오기 전까지, 이름이 있는 줄
    let endRow = rows.length;
    for (let i = headerRow + 1; i < rows.length; i += 1) {
      if (/^합계/.test(text(rows[i]?.[nameCol]))) {
        endRow = i;
        break;
      }
    }
    const ingredientRows: number[] = [];
    for (let i = headerRow + 1; i < endRow; i += 1) {
      if (text(rows[i]?.[nameCol])) ingredientRows.push(i);
    }
    // 2) 배합비율 칸 찾기: 원재료 줄들의 합이 1(=100%)에 가까운 칸.
    //    날짜별 개정으로 여러 칸이 맞을 수 있어 가장 오른쪽(최신으로 본다) 칸을 쓴다.
    const maxCol = rows.reduce((max, row) => Math.max(max, row ? row.length : 0), 0);
    let ratioCol = -1;
    for (let c = nameCol + 1; c < maxCol; c += 1) {
      let sum = 0;
      let count = 0;
      let valid = true;
      ingredientRows.forEach((i) => {
        const value = rows[i]?.[c];
        if (value === undefined || value === null || value === '') return;
        const n = number(value);
        if (Number.isNaN(n)) {
          valid = false;
          return;
        }
        if (n >= 0 && n <= 1.2) {
          sum += n;
          count += 1;
        }
      });
      if (valid && count >= ingredientRows.length * 0.6 && sum > 0.85 && sum < 1.15) ratioCol = c;
    }
    if (ratioCol >= 0) {
      ingredientRows.forEach((i) => {
        const name = text(rows[i][nameCol]);
        const ratio = number(rows[i][ratioCol]);
        if (!name || Number.isNaN(ratio)) return;
        lines.push({ materialName: name, ratioPercent: round3(ratio * 100) });
      });
    }
  }

  if (lines.length === 0) {
    // 아니면 단순 두 칸(A 원재료명 / B 배합비율%) 양식
    rows.forEach((row) => {
      const name = text(row?.[0]);
      if (!name) return;
      if (/원재료|배합비율|품명/.test(name) && lines.length === 0) return;
      const ratio = number(row?.[1]);
      if (Number.isNaN(ratio)) return;
      lines.push({ materialName: name, ratioPercent: round3(ratio) });
    });
  }
  return lines;
}

export const RECIPE_NOT_FOUND_MESSAGE =
  '엑셀에서 원재료 배합비 데이터를 찾지 못했어요. "품목" 표 형식이거나 A열=원재료명·B열=배합비율(%) 형식인지 확인해주세요.';

export const recipeLoadedMessage = (count: number) =>
  `원재료 ${count}건을 불러왔어요. 파일에 버전이 여러 개인 경우 가장 오른쪽 열을 최신으로 보고 가져왔어요 — 아래 표에서 배합비율이 맞는 버전인지 꼭 확인해주세요.`;
