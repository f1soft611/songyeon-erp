import ExcelJS from 'exceljs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { F1GridColumn } from '../src/shared/components/f1-grid/types/grid.types';
import { exportGridRowsToExcel } from '../src/shared/components/f1-grid/export/GridExcelExport';

type ExportRow = {
  id: number;
  materialCode: string;
  amount: number | string;
  price: number;
  date: string;
  createdAt: string;
  time: string;
  active: boolean | string;
  status: string;
  empty: string | null;
  invalidAmount: string;
  invalidDate: string;
  rowNumber: number | string;
  timeWithSeconds: string;
  invalidTime: string;
  invalidCheckbox: string;
  invalidCreatedAt: string;
  emptyDate: string | null;
  defaultAmount: number;
  defaultIntegerNumber: number;
  defaultIntegerAmount: number | string;
};

const columns: F1GridColumn<ExportRow>[] = [
  {
    field: 'materialCode',
    headerName: '품목코드',
    type: 'text',
  },
  {
    field: 'amount',
    headerName: 'Amount',
    type: 'number',
    format: 'number',
    decimalPlaces: 2,
  },
  {
    field: 'price',
    headerName: 'Price',
    type: 'currency',
    format: 'currency',
  },
  {
    field: 'date',
    headerName: 'Date',
    type: 'date',
    format: 'yyyy년 m월 d일',
    align: 'center',
    headerAlign: 'right',
  },
  { field: 'createdAt', headerName: 'Created at', type: 'datetime' },
  { field: 'time', headerName: 'Time', type: 'time' },
  { field: 'active', headerName: 'Active', type: 'checkbox' },
  {
    field: 'status',
    headerName: 'Status',
    type: 'select',
    options: [{ value: 'ready', label: 'Operating' }],
  },
  { field: 'empty', headerName: 'Empty' },
  { field: 'invalidAmount', headerName: 'Invalid amount', type: 'number' },
  { field: 'invalidDate', headerName: 'Invalid date', type: 'date' },
  { field: 'rowNumber', headerName: 'Row number', type: 'rownumber' },
  { field: 'timeWithSeconds', headerName: 'Time with seconds', type: 'time' },
  { field: 'invalidTime', headerName: 'Invalid time', type: 'time' },
  {
    field: 'invalidCheckbox',
    headerName: 'Invalid checkbox',
    type: 'checkbox',
  },
  {
    field: 'invalidCreatedAt',
    headerName: 'Invalid created at',
    type: 'datetime',
  },
  { field: 'emptyDate', headerName: 'Empty date', type: 'date' },
  {
    field: 'defaultAmount',
    headerName: 'Default amount',
    type: 'number',
  },
  {
    field: 'defaultIntegerNumber',
    headerName: 'Default integer number',
    type: 'number',
  },
  {
    field: 'defaultIntegerAmount',
    headerName: 'Default integer amount',
    type: 'number',
  },
];

async function readExportedWorkbook(
  rows: ExportRow[],
): Promise<ExcelJS.Workbook> {
  let exportedBlob: Blob | undefined;
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    'createObjectURL',
  );
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    'revokeObjectURL',
  );
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      exportedBlob = blob;
      return 'blob:export-test';
    },
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: () => {},
  });
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});

  try {
    await exportGridRowsToExcel(columns, rows, 'export-test');
    if (!exportedBlob) throw new Error('Excel export did not create a Blob.');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await exportedBlob.arrayBuffer());
    return workbook;
  } finally {
    click.mockRestore();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  }
}

describe('F1-Grid Excel export cell types', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports typed values, Grid-aligned date text and invalid-value fallbacks', async () => {
    const row: ExportRow = {
      id: 1,
      materialCode: '000004',
      amount: '1234.5',
      price: 12345.6,
      date: '2026-10-20T00:30:00+14:00',
      createdAt: '2026-10-20T09:21:00',
      time: '09:21',
      active: 'yes',
      status: 'ready',
      empty: null,
      invalidAmount: 'not-a-number',
      invalidDate: '2026-02-29',
      rowNumber: '7',
      timeWithSeconds: '09:21:05',
      invalidTime: '25:75',
      invalidCheckbox: 'unknown',
      invalidCreatedAt: '2026-02-29T09:21:00',
      emptyDate: null,
      defaultAmount: 1.234567,
      defaultIntegerNumber: 4,
      defaultIntegerAmount: '4',
    };
    const workbook = await readExportedWorkbook([row]);
    const sheet = workbook.getWorksheet('Sheet1');

    expect(sheet).toBeDefined();
    expect(sheet?.getCell('A2').value).toBe('000004');
    expect(sheet?.getCell('A2').type).toBe(ExcelJS.ValueType.String);
    expect(sheet?.getCell('A2').numFmt).toBe('@');
    expect(sheet?.getCell('B2').value).toBe(1234.5);
    expect(sheet?.getCell('B2').numFmt).toBe('#,##0.00');
    expect(sheet?.getCell('C2').value).toBe(12345.6);
    expect(sheet?.getCell('C2').numFmt).toBe('"₩"#,##0');

    expect(sheet?.getCell('D2').value).toBe('2026년 10월 20일');
    expect(sheet?.getCell('D2').type).toBe(ExcelJS.ValueType.String);
    expect(sheet?.getCell('D2').numFmt).toBe('@');
    expect(sheet?.getCell('A1').alignment?.horizontal).toBe('center');
    expect(sheet?.getCell('B2').alignment?.horizontal).toBe('right');
    expect(sheet?.getCell('D1').alignment?.horizontal).toBe('right');
    expect(sheet?.getCell('D2').alignment?.horizontal).toBe('center');

    expect(sheet?.getCell('E2').value).toBeInstanceOf(Date);
    expect(sheet?.getCell('E2').numFmt).toBe('yyyy-mm-dd hh:mm:ss');
    const exportedTime = sheet?.getCell('F2').value;
    if (!(exportedTime instanceof Date)) {
      throw new Error('Expected ExcelJS to read the formatted time serial as a Date.');
    }
    expect(exportedTime.getUTCHours()).toBe(9);
    expect(exportedTime.getUTCMinutes()).toBe(21);
    expect(exportedTime.toISOString().slice(0, 10)).toBe('1899-12-30');
    expect(sheet?.getCell('F2').numFmt).toBe('hh:mm');
    expect(sheet?.getCell('G2').value).toBe(true);
    expect(sheet?.getCell('H2').value).toBe('Operating');
    expect(sheet?.getCell('I2').value).toBeNull();
    expect(sheet?.getCell('J2').value).toBe('not-a-number');
    expect(sheet?.getCell('K2').value).toBe('2026-02-29');
    expect(sheet?.getCell('K2').alignment?.horizontal).toBe('left');
    expect(sheet?.getCell('L2').value).toBe(7);
    const exportedTimeWithSeconds = sheet?.getCell('M2').value;
    if (!(exportedTimeWithSeconds instanceof Date)) {
      throw new Error('Expected ExcelJS to read the formatted time serial as a Date.');
    }
    expect(exportedTimeWithSeconds.getUTCHours()).toBe(9);
    expect(exportedTimeWithSeconds.getUTCMinutes()).toBe(21);
    expect(exportedTimeWithSeconds.getUTCSeconds()).toBe(5);
    expect(sheet?.getCell('M2').numFmt).toBe('hh:mm:ss');
    expect(sheet?.getCell('N2').value).toBe('25:75');
    expect(sheet?.getCell('O2').value).toBe('unknown');
    expect(sheet?.getCell('P2').value).toBe('2026-02-29T09:21:00');
    expect(sheet?.getCell('Q2').value).toBeNull();
    expect(sheet?.getCell('Q2').alignment?.horizontal).toBe('left');
    expect(sheet?.getCell('R2').value).toBe(1.234567);
    expect(sheet?.getCell('R2').numFmt).toBe('#,##0.#####');
    expect(sheet?.getCell('S2').value).toBe(4);
    expect(sheet?.getCell('S2').numFmt).toBe('#,##0');
    expect(sheet?.getCell('T2').value).toBe(4);
    expect(sheet?.getCell('T2').numFmt).toBe('#,##0');
    expect(row.date).toBe('2026-10-20T00:30:00+14:00');
  });
});
