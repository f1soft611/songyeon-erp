import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 라벨출력 · 생산확정 인쇄 창(2026-11-05): 버전의 식품유형 · 보관방법은 공통코드 코드라, 보이는 칸에는 공통코드 이름을 쓴다
const labelApi = vi.hoisted(() => ({
  getLabelCompanyInfo: vi.fn(),
  listLabelMarks: vi.fn(),
  listLabelTemplates: vi.fn(),
  listLabelVersions: vi.fn(),
  getLabelVersion: vi.fn(),
  getLabelBom: vi.fn(),
  getLabelBomAllergens: vi.fn(),
}));
const codeApi = vi.hoisted(() => ({ fetchCommonCodeGroups: vi.fn(), fetchCommonCodeItems: vi.fn() }));

vi.mock('../src/shared/components/LabelPrintDialog/label.service', () => labelApi);
vi.mock('../src/pages/co/master/common-code/services/commonCodeManagement.service', () => codeApi);

import { LabelPrintDialog } from '../src/shared/components/LabelPrintDialog';

const ITEMS: Record<string, { itemCode: string; itemNm: string; useAt: string }[]> = {
  g1: [{ itemCode: '001', itemNm: '복합조미식품', useAt: 'Y' }, { itemCode: '002', itemNm: '소스(살균제품)', useAt: 'Y' }],
  g2: [{ itemCode: '002', itemNm: '냉장(0℃~10℃)', useAt: 'Y' }],
};

beforeEach(() => {
  labelApi.getLabelCompanyInfo.mockResolvedValue({ businessName: '송연' });
  labelApi.listLabelMarks.mockResolvedValue([]);
  labelApi.listLabelTemplates.mockResolvedValue([]);
  labelApi.listLabelVersions.mockResolvedValue({ versions: [{ id: 5, versionLabel: 'v1', isCurrent: 1 }], currentId: 5 });
  labelApi.getLabelVersion.mockResolvedValue({ foodType: '002', storage: '002', netWeight: '5Kg', layout: {} });
  labelApi.getLabelBom.mockResolvedValue([]);
  labelApi.getLabelBomAllergens.mockResolvedValue(null);
  codeApi.fetchCommonCodeGroups.mockResolvedValue([{ id: 'g1', groupCode: 'FOOD_TYPE' }, { id: 'g2', groupCode: 'STORAGE_METHOD' }]);
  codeApi.fetchCommonCodeItems.mockImplementation(async (id: string) => ITEMS[id] ?? []);
});

describe('라벨 인쇄 창 식품유형 · 보관방법', () => {
  it('코드 대신 공통코드 이름이 보이고, 미리보기에도 이름이 찍힌다', async () => {
    render(<LabelPrintDialog target={{ code: '000007', name: '간장소스', mfgDate: '2026-11-05' }} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByRole('textbox', { name: '식품유형' })).toHaveValue('소스(살균제품)'));
    expect(screen.getByRole('textbox', { name: '보관방법' })).toHaveValue('냉장(0℃~10℃)');
    expect(document.body.innerHTML).toContain('>소스(살균제품)</td>');
    expect(document.body.innerHTML).not.toContain('>002</td>');
  });
});
