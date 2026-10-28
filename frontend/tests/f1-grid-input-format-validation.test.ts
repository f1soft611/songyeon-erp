import { describe, expect, it, vi } from 'vitest';
import { validateGridRow } from '../src/shared/components/f1-grid/validation/GridValidation';
import type { F1GridColumn } from '../src/shared/components/f1-grid';

type Row = {
  businessNo: string;
  telephoneNo: string;
};

const businessColumns: F1GridColumn<Row>[] = [
  {
    field: 'businessNo',
    headerName: '사업자번호',
    inputFormat: { type: 'digits', groupSizes: [3, 2], validDigitCounts: [10] },
  },
];

const phoneColumns: F1GridColumn<Row>[] = [
  {
    field: 'telephoneNo',
    headerName: '전화번호',
    inputFormat: { type: 'korean-phone', maxDigits: 11 },
  },
];

describe('validateGridRow input format digit lengths', () => {
  it('passes valid and empty optional digit values', () => {
    expect(
      validateGridRow({ businessNo: '123-45-67890', telephoneNo: '' }, businessColumns),
    ).toEqual({});
    expect(validateGridRow({ businessNo: '', telephoneNo: '' }, businessColumns)).toEqual({});
  });

  it('rejects non-empty digit values with invalid lengths', () => {
    expect(
      validateGridRow({ businessNo: '123-45-6789', telephoneNo: '' }, businessColumns),
    ).toEqual({
      businessNo: '사업자번호은(는) 10자리여야 합니다.',
    });

    expect(
      validateGridRow({ businessNo: '123-45-678901', telephoneNo: '' }, businessColumns),
    ).toEqual({
      businessNo: '사업자번호은(는) 10자리여야 합니다.',
    });
  });

  it('validates korean phone digit lengths by prefix', () => {
    expect(
      validateGridRow({ businessNo: '', telephoneNo: '02-123-4567' }, phoneColumns),
    ).toEqual({});
    expect(
      validateGridRow({ businessNo: '', telephoneNo: '02-1234-5678' }, phoneColumns),
    ).toEqual({});
    expect(
      validateGridRow({ businessNo: '', telephoneNo: '031-123-4567' }, phoneColumns),
    ).toEqual({});
    expect(
      validateGridRow({ businessNo: '', telephoneNo: '010-1234-5678' }, phoneColumns),
    ).toEqual({});

    expect(
      validateGridRow({ businessNo: '', telephoneNo: '02-12-3456' }, phoneColumns),
    ).toEqual({
      telephoneNo:
        '전화번호은(는) 02는 9자리 또는 10자리, 그 외는 10자리 또는 11자리여야 합니다.',
    });

    expect(
      validateGridRow({ businessNo: '', telephoneNo: '02-12345-67890' }, phoneColumns),
    ).toEqual({
      telephoneNo:
        '전화번호은(는) 02는 9자리 또는 10자리, 그 외는 10자리 또는 11자리여야 합니다.',
    });

    expect(
      validateGridRow({ businessNo: '', telephoneNo: '123-456-789' }, phoneColumns),
    ).toEqual({
      telephoneNo:
        '전화번호은(는) 02는 9자리 또는 10자리, 그 외는 10자리 또는 11자리여야 합니다.',
    });
  });

  it('runs custom validate only after input format length passes', () => {
    const customValidate = vi.fn(() => '커스텀 오류');
    const columns: F1GridColumn<Row>[] = [
      {
        field: 'businessNo',
        headerName: '사업자번호',
        inputFormat: { type: 'digits', validDigitCounts: [10] },
        validate: customValidate,
      },
    ];

    expect(
      validateGridRow({ businessNo: '123-45-6789', telephoneNo: '' }, columns),
    ).toEqual({
      businessNo: '사업자번호은(는) 10자리여야 합니다.',
    });
    expect(customValidate).not.toHaveBeenCalled();

    expect(
      validateGridRow({ businessNo: '123-45-67890', telephoneNo: '' }, columns),
    ).toEqual({
      businessNo: '커스텀 오류',
    });
    expect(customValidate).toHaveBeenCalledTimes(1);
  });
});
