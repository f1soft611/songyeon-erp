import { useMemo, useState, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridOption,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../../shared/components/f1-grid';
import { resetGridStorageIfColumnsChanged } from '../../../../../shared/utils/gridStorage';
import type { ExcelColumn } from '../../../../../shared/utils/excelFile';
import type { ClientMasterRow } from '../types/partnerMaster.types';
import { sanitizeCustomerNumberInput } from '../utils/customerNumberInput';

const STORAGE_KEY = 'cm-basic-info-client-master-grid';
// 2026-10-20 코드 칸을 더하고 작업(수정 · 삭제) 칸을 뺐다. 2026-10-23 코드 칸을 다시 빼고 사용여부 칸을 더했다.
// 2026-10-27 창에만 보이는 칸(숨긴 칸)을 더했다. 저장된 칸 순서에 지금 칸이 하나라도 없으면 처음 순서로 다시 시작한다
const GRID_FIELDS = [
  'id',
  'name',
  'clientType',
  'clientCode',
  'businessNo',
  'useYn',
  'ceoName',
  'businessType',
  'businessItem',
  'phone',
  'fax',
  'mobile',
  'email',
  'zipcode',
  'address',
  'addressDetail',
  'memo',
  'regUserNm',
  'regDt',
  'updUserNm',
  'updDt',
];

// 분류(2026-10-23): 저장은 공통코드 CUSTOMER_CATEGORY 코드, 보여 주기는 서버가 이어 준 이름(없으면 코드 그대로)
export const clientTypeName = (row: Pick<ClientMasterRow, 'clientType' | 'clientTypeNm'>): string =>
  row.clientTypeNm || row.clientType;

// [엑셀 양식 내려받기] 칸 순서. 올리기는 화면이 첫 줄 제목으로 칸을 찾아 그리드에 올린다(stageClientExcel). 2026-10-27 상세주소 칸을 뺐다(등록 · 수정 창에도 없다)
export const CLIENT_EXCEL_COLUMNS: ExcelColumn<ClientMasterRow>[] = [
  { key: 'name', label: '거래처명', width: 28 },
  // 분류는 이름으로 쓴다. 올리기는 이름 · 코드 · 예전 글자(매입 · 매출 · 매입+매출)를 모두 받아 코드로 바꾼다(clientTypeCodeOf)
  { key: (row) => clientTypeName(row), label: '분류', width: 16 },
  { key: 'businessNo', label: '사업자등록번호', width: 16 },
  { key: 'ceoName', label: '대표자명', width: 16 },
  { key: 'businessType', label: '업태', width: 16 },
  { key: 'businessItem', label: '종목', width: 16 },
  { key: 'phone', label: '전화', width: 16 },
  { key: 'fax', label: '팩스', width: 16 },
  { key: 'mobile', label: '모바일', width: 16 },
  { key: 'email', label: 'Email', width: 28 },
  { key: 'zipcode', label: '우편번호', width: 16 },
  { key: 'address', label: '주소', width: 28 },
  { key: 'memo', label: '메모', width: 16 },
];

// 제목줄 [엑셀 다운로드] 칸. 거래처 전체 칸 양식은 [엑셀 양식 내려받기](CLIENT_EXCEL_COLUMNS)
export const PARTNER_LIST_EXCEL_COLUMNS: ExcelColumn<ClientMasterRow>[] = [
  { key: 'name', label: '거래처명', width: 28 },
  { key: (row) => clientTypeName(row), label: '분류', width: 18 },
  { key: 'businessNo', label: '사업자등록번호', width: 16 },
];

export function createClientRow(): ClientMasterRow {
  return {
    id: `new-customer-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    clientId: 0,
    clientCode: '',
    name: '',
    clientType: '',
    clientTypeNm: '',
    businessNo: '',
    ceoName: '',
    businessType: '',
    businessItem: '',
    phone: '',
    fax: '',
    mobile: '',
    email: '',
    zipcode: '',
    address: '',
    addressDetail: '',
    memo: '',
    useYn: 'Y',
    regUserNm: '',
    regDt: '',
    updUserNm: '',
    updDt: '',
  };
}

export function createPartnerMasterColumns(
  canEdit: boolean,
  clientTypeOptions: F1GridOption[]
): F1GridColumn<ClientMasterRow>[] {
  return [
    {
      field: 'id',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      field: 'clientCode',
      headerName: '거래처코드',
      width: 110,
      align: 'center',
      editable: false,
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'name',
      headerName: '거래처명',
      flex: 1.4,
      width: 200,
      headerAlign: 'center',
      align: 'left',
      editable: canEdit,
      required: true,
      pinned: 'left',
      form: { group: '기본정보', order: 1 },
      search: { hidden: true },
    },
    {
      // 분류: 저장은 코드, 보이는 것은 공통코드 이름(2026-10-23)
      field: 'clientType',
      headerName: '분류',
      width: 130,
      type: 'select',
      options: clientTypeOptions,
      headerAlign: 'center',
      align: 'center',
      editable: canEdit,
      required: true,
      form: { group: '기본정보', order: 2 },
      search: { label: '분류', order: 1 },
    },
    {
      field: 'ceoName',
      headerName: '대표자',
      width: 100,
      editable: canEdit,
      form: { group: '사업자정보', order: 1 },
      search: { label: '대표자', order: 2 },
    },
    {
      field: 'businessNo',
      headerName: '사업자등록번호',
      width: 120,
      headerAlign: 'center',
      align: 'center',
      editable: canEdit,
      inputFormat: {
        type: 'digits',
        groupSizes: [3, 2],
        maxDigits: 10,
        validDigitCounts: [10],
      },
      sanitizeInput: sanitizeCustomerNumberInput,
      form: { group: '사업자정보', order: 1 },
      search: { label: '사업자번호', order: 3 },
    },
    {
      field: 'businessType',
      headerName: '업태',
      width: 110,
      editable: canEdit,
      form: { group: '사업자정보', order: 3 },
      search: { label: '업태', order: 4 },
    },
    {
      field: 'businessItem',
      headerName: '종목',
      width: 110,
      editable: canEdit,
      form: { group: '사업자정보', order: 4 },
      search: { label: '종목', order: 5 },
    },
    {
      field: 'phone',
      headerName: '전화번호',
      width: 100,
      editable: canEdit,
      align: 'center',
      inputFormat: { type: 'korean-phone', maxDigits: 11 },
      sanitizeInput: sanitizeCustomerNumberInput,
      form: { group: '연락처', order: 1 },
      search: { hidden: true },
    },
    {
      field: 'fax',
      headerName: '팩스번호',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '연락처', order: 2 },
      inputFormat: { type: 'korean-phone', maxDigits: 11 },
      sanitizeInput: sanitizeCustomerNumberInput,
      search: { hidden: true },
    },
    {
      field: 'mobile',
      headerName: '모바일',
      hidden: true,
      editable: canEdit,
      align: 'center',
      inputFormat: { type: 'korean-phone', maxDigits: 11 },
      sanitizeInput: sanitizeCustomerNumberInput,
      // 표에서 숨긴 칸은 form.hidden: false 를 적어야 창에 나온다(F1-Grid 규칙)
      form: { hidden: false, group: '연락처', order: 3 },
      search: { hidden: true },
    },
    {
      field: 'email',
      headerName: 'Email',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '연락처', order: 4 },
      search: { hidden: true },
    },
    {
      field: 'zipcode',
      headerName: '우편번호',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '연락처', order: 5 },
      inputFormat: { type: 'digits', maxDigits: 5, validDigitCounts: [5] },
      sanitizeInput: sanitizeCustomerNumberInput,
      search: { hidden: true },
    },
    {
      field: 'address',
      headerName: '주소',
      width: 260,
      editable: canEdit,
      form: { group: '연락처', order: 6, span: 2 },
      search: { hidden: true },
    },
    {
      field: 'useYn',
      headerName: '사용여부',
      width: 90,
      type: 'select',
      align: 'center',
      editable: canEdit,
      options: [
        { value: 'Y', label: '사용' },
        { value: 'N', label: '미사용' },
      ],
      form: { group: '기본정보', order: 3 },
      search: { label: '사용여부', order: 6 },
    },
    {
      field: 'memo',
      headerName: '메모',
      hidden: true,
      editable: canEdit,
      form: { hidden: false, group: '기타', order: 1, span: 2 },
      search: { hidden: true },
    },
    {
      field: 'regUserNm',
      search: { hidden: true },
      headerName: '등록자',
      type: 'text',
      width: 100,
      align: 'center',
      editable: false,
    },
    {
      field: 'regDt',
      search: { hidden: true },
      headerName: '등록일시',
      type: 'datetime',
      width: 130,
      align: 'center',
      editable: false,
    },
    {
      field: 'updUserNm',
      search: { hidden: true },
      headerName: '수정자',
      type: 'text',
      width: 100,
      align: 'center',
      editable: false,
    },
    {
      field: 'updDt',
      search: { hidden: true },
      headerName: '수정일시',
      type: 'datetime',
      width: 130,
      align: 'center',
      editable: false,
    },
  ];
}

type PartnerMasterGridProps = {
  rows: ClientMasterRow[];
  columns: F1GridColumn<ClientMasterRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<ClientMasterRow> | null>;
  onChangesChange: (changes: F1GridChanges<ClientMasterRow>) => void;
  onValidationErrors?: (errors: F1GridValidationError[]) => void;
  // 엑셀 올리기로 줄을 넣는 동안 false(2026-10-27). 내장 상세 창이 켜져 있으면 addRow 가 등록 창을 연다
  formEnabled?: boolean;
};

export function PartnerMasterGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
  onValidationErrors,
  formEnabled = true,
}: PartnerMasterGridProps) {
  // 그리드를 그리기 전에 저장된 칸 순서를 맞춘다(처음 한 번)
  useState(() => resetGridStorageIfColumnsChanged(STORAGE_KEY, GRID_FIELDS));

  // S_ERP CustomerGrid 와 같음: 등록 · 수정 권한이 없으면 상세 창을 끈다
  const rowFormPlugin = useMemo(() => {
    if (!formEnabled || (!canCreate && !canUpdate)) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? '거래처 등록' : '거래처 수정'),
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? canCreate : canUpdate),
    };
  }, [canCreate, canUpdate, formEnabled]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="F1-GRID 거래처"
      storageKey="cm-basic-info-client-master-grid"
      rows={rows}
      columns={columns}
      rowKey="id"
      rowFormPlugin={rowFormPlugin}
      createRow={createClientRow}
      onChangesChange={onChangesChange}
      onValidationErrors={onValidationErrors}
      loading={loading}
      height="100%"
      maxHeight="100%"
      rowHeight={34}
      minRowHeight={34}
      maxRowHeight={320}
      showCheckbox={false}
      canExportExcel={canExportExcel}
      excelFileName="거래처마스터"
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
