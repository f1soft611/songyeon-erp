import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  countByStatus,
  filterSummaries,
  toTreeRows,
} from '../src/pages/settings/system/screen-reviews/screenReviewManagement';
import type { ScreenReviewSummary } from '../src/pages/settings/system/screen-reviews/types/screenReviewManagement.types';

const apiMocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => apiMocks);

const row = (menuCode: string, moduleCode: string, displayStatus: ScreenReviewSummary['displayStatus'], extra: Partial<ScreenReviewSummary> = {}): ScreenReviewSummary => ({
  moduleCode,
  moduleName: moduleCode === 'CO' ? '기준정보' : '생산관리',
  menuId: menuCode.length,
  menuCode,
  menuName: `${menuCode} 화면`,
  groupName: '기초정보',
  developerName: null,
  reviewDate: null,
  displayStatus,
  lastComment: null,
  ...extra,
});

// 창고 화면은 수정요청이 여러 번 쌓여도 서버가 화면당 한 줄로 준다
const ROWS: ScreenReviewSummary[] = [
  row('BSWarehouseView', 'CO', 'CHANGE_REQUESTED', { developerName: '김개발', lastComment: '창고 칸 추가\n두 번째 줄' }),
  row('BSItemMasterView', 'CO', 'COMPLETED', { reviewDate: '2026-11-03' }),
  row('BSBoxTypeView', 'CO', 'NOT_STARTED'),
  row('PDPlanView', 'PD', 'IN_PROGRESS', { developerName: '이개발' }),
];

describe('화면검수 관리 규칙', () => {
  it('건수는 화면 수로 센다', () => {
    expect(countByStatus(ROWS)).toEqual({ total: 4, COMPLETED: 1, IN_PROGRESS: 1, CHANGE_REQUESTED: 1, NOT_STARTED: 1 });
  });

  it('화면명 · 화면코드 글자, 구분 · 상태 · 담당자로 거른다', () => {
    expect(filterSummaries(ROWS, { keyword: 'warehouse', moduleCode: '', status: '', developer: '' }).map((r) => r.menuCode)).toEqual(['BSWarehouseView']);
    expect(filterSummaries(ROWS, { keyword: 'PDPlanView 화면', moduleCode: '', status: '', developer: '' }).map((r) => r.menuCode)).toEqual(['PDPlanView']);
    expect(filterSummaries(ROWS, { keyword: '', moduleCode: 'CO', status: 'COMPLETED', developer: '' }).map((r) => r.menuCode)).toEqual(['BSItemMasterView']);
    expect(filterSummaries(ROWS, { keyword: '', moduleCode: '', status: '', developer: '이개발' }).map((r) => r.menuCode)).toEqual(['PDPlanView']);
  });

  it('모듈 묶음 줄에 거른 뒤 건수를 붙이고, 화면이 없는 모듈은 묶음 줄도 만들지 않는다', () => {
    const tree = toTreeRows(filterSummaries(ROWS, { keyword: '', moduleCode: '', status: 'IN_PROGRESS', developer: '' }));
    expect(tree.map((r) => [r.id, r.parentId, r.category, r.menuName])).toEqual([
      ['module:PD', null, '생산관리 (1)', null],
      ['menu:PDPlanView', 'module:PD', '기초정보', 'PDPlanView 화면'],
    ]);
  });
});

describe('화면검수 관리 화면', () => {
  beforeEach(() => {
    apiMocks.apiGet.mockReset();
    apiMocks.apiGet.mockResolvedValue({ items: ROWS });
  });

  it('카드에 화면 수와 진행률을 보여 준다', async () => {
    const { ScreenReviewManagementPage } = await import('../src/pages/settings/system/screen-reviews/ScreenReviewManagementPage');
    render(
      <ScreenReviewManagementPage
        selectedModule={{ id: 'settings', name: '환경설정' } as never}
        currentMenuName="화면검수 관리"
        content={{ title: '화면검수 관리', description: '설명', cards: [], items: [] } as never}
        selectedMenuPermissions={{ read: true } as never}
      />,
    );
    await waitFor(() => expect(apiMocks.apiGet).toHaveBeenCalledWith('/api/v1/system/screen-reviews'));
    const cards = await screen.findByLabelText('화면검수 건수');
    await waitFor(() => expect(within(cards).getByLabelText('전체 화면')).toHaveTextContent('4개'));
    expect(within(cards).getByLabelText('수정요청')).toHaveTextContent('1개');
    expect(within(cards).getByLabelText('수정요청')).toHaveTextContent('25%');
    expect(within(cards).getByLabelText('전체 진행률')).toHaveTextContent('4개 중 1개 완료');
  }, 30000);
});
