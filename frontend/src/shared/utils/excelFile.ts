// 엑셀 양식 내려받기·올린 엑셀 읽기(송연 shared/utils/excel.ts 를 이 프로젝트의 exceljs 로 옮김).
// 엑셀을 누를 때만 불러와 첫 화면이 무거워지지 않게 한다.

// width: 칸 너비(글자 수). 주면 손으로 넓히지 않아도 이름·주소가 보인다.
export type ExcelColumn<T> = {
  key: keyof T | ((row: T) => unknown);
  label: string;
  width?: number;
};

// 오늘 날짜(2026-10-02). 이 PC 날짜로 붙인다.
export function todayDash(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 머리글 한 줄 + 줄마다 칸을 뽑아 한 장짜리 엑셀로 내려받는다.
export async function downloadExcel<T>(
  rows: T[],
  columns: ExcelColumn<T>[],
  fileName: string,
  sheetName = 'Sheet1',
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({ header: column.label, width: column.width ?? 12 }));
  rows.forEach((row) => {
    sheet.addRow(
      columns.map((column) => {
        const value = typeof column.key === 'function' ? column.key(row) : row[column.key];
        return value ?? '';
      }),
    );
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// 올린 엑셀 첫 장을 줄 그대로(머리줄 포함) 읽는다. 칸은 모두 보이는 글자로 읽어 사업자등록번호 모양이 바뀌지 않게 한다.
export async function readExcelRows(file: File): Promise<string[][]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  for (let r = 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= row.cellCount; c += 1) {
      cells.push((row.getCell(c).text ?? '').toString());
    }
    rows.push(cells);
  }
  return rows;
}

// 올린 엑셀 첫 장을 값 그대로 읽는다(숫자는 숫자, 수식은 계산된 값). 배합비율처럼 % 서식 칸도 0.125 처럼 원래 값으로 받는다.
export async function readExcelValues(file: File): Promise<unknown[][]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: unknown[][] = [];
  for (let r = 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const cells: unknown[] = [];
    for (let c = 1; c <= row.cellCount; c += 1) {
      const value = row.getCell(c).value as unknown;
      if (value && typeof value === 'object') {
        const box = value as { result?: unknown; richText?: { text: string }[]; text?: unknown };
        if ('result' in box) cells.push(box.result ?? '');
        else if (Array.isArray(box.richText)) cells.push(box.richText.map((part) => part.text).join(''));
        else if ('text' in box) cells.push(box.text ?? '');
        else cells.push(value);
      } else {
        cells.push(value ?? '');
      }
    }
    rows.push(cells);
  }
  return rows;
}

// 송연 todayFileTag(2026-10-27 co/basic-info/utils/materialMaster 에서 옮김): 파일 이름 끝의 오늘 날짜(20261002)
export function todayFileTag(date = new Date()): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}
