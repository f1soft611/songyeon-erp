import type { Workbook } from 'exceljs';

// 제품등록 '양식 내려받기': 레시피 엑셀 불러오기(parseRecipeRows)가 읽는 "품목" 표 양식.
// 첫 장은 화면이 읽는 표, 둘째 장은 작성 방법 안내(화면은 첫 장만 읽는다).

export const RECIPE_TEMPLATE_FILE_NAME = '레시피_배합비_양식.xlsx';

// 예시 줄(지우고 쓰면 된다). 배합비율은 0~1 소수(0.45 = 45%)
const SAMPLE_LINES: [string, number][] = [
  ['양파분말', 0.45],
  ['하얀설탕', 0.35],
  ['구운소금', 0.2],
];
const BLANK_LINES = 17; // 예시와 합쳐 원재료 20줄까지 적을 수 있다

const GUIDE_LINES = [
  '레시피 배합비 양식 작성 방법',
  '',
  '1. 첫 번째 시트(레시피)만 읽어요. 시트 순서를 바꾸지 마세요.',
  '2. "품목" 칸 아래에 원재료명을 적어요. "품목" 글자와 "합계" 줄은 지우거나 고치지 마세요.',
  '3. 배합비율은 0~1 사이 소수로 적어요. 0.45 = 45% 예요(칸은 % 로 보여요).',
  '4. 배합비율 합계가 100% 근처(85%~115%)여야 그 칸을 배합비율로 알아봐요.',
  '5. 개정이 여러 번이면 오른쪽에 칸을 더 만들어 적어요(예: 2차(9/15)). 가장 오른쪽 칸을 최신으로 보고 가져와요.',
  '6. 배합비율 칸에는 숫자만 적어요. "미정" 같은 글자가 있으면 그 칸을 읽지 못해요.',
  '7. 원재료명이 원재료관리에 등록된 이름과 같으면 단가가 자동으로 들어가요.',
  '8. 줄이 모자라면 "합계" 줄 위에 줄을 더 넣고, 합계 수식 범위도 같이 늘려주세요.',
  '',
  '예시 줄(양파분말·하얀설탕·구운소금)은 지우고 쓰세요.',
];

export function buildRecipeTemplate(workbook: Workbook): Workbook {
  const sheet = workbook.addWorksheet('레시피');
  sheet.columns = [
    { width: 6 },
    { width: 32 },
    { width: 14 },
    { width: 24 },
  ];
  sheet.getCell('A1').value = '레시피 배합비';
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A2').value = '제품명:';
  sheet.getCell('A2').font = { color: { argb: 'FF64748B' } };

  const headerRow = 4;
  const header = sheet.getRow(headerRow);
  header.values = ['No', '품목', '1차', '비고'];
  header.font = { bold: true };
  header.alignment = { horizontal: 'center' };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  const first = headerRow + 1;
  const total = SAMPLE_LINES.length + BLANK_LINES;
  for (let i = 0; i < total; i += 1) {
    const row = sheet.getRow(first + i);
    const sample = SAMPLE_LINES[i];
    row.getCell(1).value = i + 1;
    row.getCell(1).alignment = { horizontal: 'center' };
    if (sample) {
      row.getCell(2).value = sample[0];
      row.getCell(3).value = sample[1];
    }
    row.getCell(3).numFmt = '0.0##%';
  }
  const last = first + total - 1;
  const sumRow = sheet.getRow(last + 1);
  sumRow.getCell(2).value = '합계';
  sumRow.getCell(3).value = {
    formula: `SUM(C${first}:C${last})`,
    result: SAMPLE_LINES.reduce((sum, line) => sum + line[1], 0),
  };
  sumRow.getCell(3).numFmt = '0.0##%';
  sumRow.font = { bold: true };
  sumRow.eachCell((cell) => {
    cell.border = { top: { style: 'thin' } };
  });

  const guide = workbook.addWorksheet('작성방법');
  guide.getColumn(1).width = 100;
  GUIDE_LINES.forEach((line, index) => {
    const cell = guide.getCell(index + 1, 1);
    cell.value = line;
    if (index === 0) cell.font = { bold: true, size: 13 };
  });
  return workbook;
}

// 양식을 만들어 내려받는다(엑셀을 누를 때만 exceljs 를 불러온다)
export async function downloadRecipeTemplate(): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = buildRecipeTemplate(new ExcelJS.Workbook());
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = RECIPE_TEMPLATE_FILE_NAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
