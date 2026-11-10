import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';

// 검사 탭은 화면을 열면 로트를 부른다(20261106_003). 여기서는 빈 목록
const api = vi.hoisted(() => ({ apiGet: vi.fn(async () => ({ resultList: [] })), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

import { ProductInspectionManagementPage } from '../src/pages/qm/inspection/product-inspection/ProductInspectionManagementPage';
import { InspectionRecordDialog } from '../src/pages/qm/inspection/product-inspection/components/InspectionRecordDialog';
import { ProductSpecDialog } from '../src/pages/qm/inspection/product-inspection/components/ProductSpecDialog';

// 품질관리 > 품질검사 > 제품검사(화면만, 2026-11-06). 송연 qdoc-spec.html 의 탭에서 식품유형 탭을 뺐다(공통코드 FOOD_TYPE)
const renderPage = () =>
  render(
    <ThemeProvider theme={createTheme()}>
      <ProductInspectionManagementPage
        selectedModule={{ id: 'qm', name: '품질관리', icon: null, tree: [], menus: [] }}
        currentMenuName="제품검사"
        content={{ title: '제품검사', description: '', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: true }}
      />
    </ThemeProvider>,
  );

const headers = () => screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim()).filter(Boolean);

describe('제품검사 화면', () => {
  it('탭은 검사 · 제품별 기준 · 염도·BRIX 현황 세 개다(식품유형 탭 없음)', () => {
    renderPage();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['검사', '제품별 기준', '염도·BRIX 현황']);
    expect(screen.queryByRole('tab', { name: '식품유형' })).toBeNull();
  });

  it('검사 탭: 원본 조회 조건(처음엔 비어 있음)과 표 칸', () => {
    renderPage();
    expect(screen.getByRole('combobox', { name: '날짜 기준' })).toHaveTextContent('제조일');
    expect(screen.getByLabelText('시작일')).toHaveValue('');
    expect(screen.getByLabelText('종료일')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: '상태' })).toHaveTextContent('전체');
    expect(screen.getByRole('checkbox', { name: '생산예정도 보기' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: '선택한 것 인쇄' })).toBeInTheDocument();
    expect(headers()).toEqual(expect.arrayContaining(['No', '로트번호', '제조일', '품목', '식품유형', '생산량', '출고일', '성적서']));
  });

  it('상태 선택지는 원본과 같다', () => {
    renderPage();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '상태' }));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      '전체', '아직 안 쓴 것', '검토 기다리는 것', '반려된 것', '승인된 것',
    ]);
  });

  it('제품별 기준 탭: 제품명/제품코드 검색과 표 칸', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '제품별 기준' }));
    expect(screen.getByRole('textbox', { name: '제품명 또는 제품코드 검색' })).toHaveValue('');
    expect(headers()).toEqual(expect.arrayContaining(['No', '제품코드', '제품명', '규격', '식품유형', '기준']));
    expect(headers()).not.toContain('로트번호');
  });

  it('염도·BRIX 현황 탭: 표 칸', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: '염도·BRIX 현황' }));
    expect(screen.getByRole('textbox', { name: '제품명 또는 로트번호 검색' })).toHaveValue('');
    expect(headers()).toEqual(expect.arrayContaining(['No', '측정일', '제조일(로트번호)', '품목', '염도 기준', '염도 결과', 'BRIX 기준', 'BRIX 결과']));
  });
});

describe('제품 검사 창(모양만)', () => {
  it('저절로 채워지는 칸 6개 · 검사항목 표 · 저장과 결재는 눌리지 않는다', () => {
    render(
      <InspectionRecordDialog
        target={{ lotNo: 'L-1', productName: '간장소스', netWeight: '5Kg', madeOn: '2026-11-06', qty: '100', shippedOn: '2026-11-07', shipState: '예정', shelfLife: '' }}
        onClose={() => undefined}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('로트 L-1 · 간장소스')).toBeInTheDocument();
    for (const label of ['제품명', '내용량', '제조일자', '생산량', '출고일', '소비기한']) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(within(dialog).getByText('2026-11-07 (예정)')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['검사항목', '규격', '측정값', '판정']);
    expect(within(dialog).getByRole('button', { name: '임시저장' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '결재 올리기' })).toBeDisabled();
  });
});

describe('제품별 기준 창(모양만)', () => {
  it('항목 표 칸 · 저장과 가져오기는 눌리지 않고 닫기는 닫는다', () => {
    const onClose = vi.fn();
    render(<ProductSpecDialog target={{ code: '000007', name: '간장소스', foodTypeName: '소스(살균제품)' }} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('간장소스 · 000007 · 식품유형 소스(살균제품)')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['항목', '최소', '최대', '식품유형 기본값', '지금 어떻게 판정하나']);
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '다른 제품에서 가져오기' })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
