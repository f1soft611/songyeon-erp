// 2026-11-04 S_ERP unified-search 테스트(송연 키 이름에 맞춤)
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { UnifiedSearch } from '../src/shared/components/search/UnifiedSearch';
import { UnifiedSearchPage } from '../src/pages/search/UnifiedSearchPage';
import { searchUnified } from '../src/shared/services/unifiedSearchService';
import type { SearchCategory } from '../src/shared/types/unifiedSearch.types';

const api = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

function response(title = '검색 공지', path = '/groupware/community/notice?dashboardPostId=21') {
  return { item: { groups: (['MENU', 'DOCUMENT', 'NOTICE'] as SearchCategory[]).map((type) => ({
    type,
    items: [{ id: 21, type, title: `${title} ${type}`, description: '그룹웨어 · 작성자', path }],
    totalCount: type === 'NOTICE' ? 23 : 1, offset: 0, limit: 5,
  })) } };
}

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>뒤로</button>
  </>;
}

function setup(initialEntry = '/groupware/overview') {
  render(<MemoryRouter initialEntries={[initialEntry]}>
    <UnifiedSearch /><Navigation />
    <Routes>
      <Route path="/search" element={<UnifiedSearchPage />} />
      <Route path="*" element={<p>업무 화면</p>} />
    </Routes>
  </MemoryRouter>);
}

function submit(keyword: string) {
  fireEvent.change(screen.getByLabelText('통합검색 검색어'), { target: { value: keyword } });
  fireEvent.click(screen.getByRole('button', { name: '통합검색 실행' }));
}

describe('unified search', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.apiGet.mockImplementation(async (url: string) => {
      const params = new URL(url, 'http://localhost').searchParams;
      const result = response(params.get('keyword') ?? '검색');
      const type = params.get('type') ?? 'ALL';
      const offset = Number(params.get('offset'));
      if (type !== 'ALL') {
        result.item.groups = result.item.groups.filter((group) => group.type === type).map((group) => ({
          ...group, offset, limit: 10,
        }));
      }
      return result;
    });
  });

  it.each(['header', 'page'])('keeps validation text only for the %s form as appropriate', async (variant) => {
      setup(variant === 'page' ? '/search' : '/groupware/overview');
      const field = screen.getByLabelText(variant === 'page' ? '결과 검색어' : '통합검색 검색어');
      const button = screen.getByRole('button', { name: variant === 'page' ? '다시 검색' : '통합검색 실행' });
      for (const value of ['', '   ']) {
        fireEvent.change(field, { target: { value } });
        fireEvent.click(button);
        expect(field).toHaveAttribute('aria-invalid', 'true');
        if (variant === 'page') {
          expect(screen.getByText('검색어는 2~100자로 입력해 주세요.')).toBeVisible();
        } else {
          expect(screen.queryByText('검색어는 2~100자로 입력해 주세요.')).not.toBeInTheDocument();
        }
        expect(api.apiGet).not.toHaveBeenCalled();
      }
      expect(screen.getByTestId('location')).toHaveTextContent(variant === 'page' ? '/search' : '/groupware/overview');
      fireEvent.change(field, { target: { value: '검색' } });
      expect(field).toHaveAttribute('aria-invalid', 'false');
  });

  it('encodes the query and retains bounded type-specific page sizes', async () => {
    await searchUnified('한글 & 공지', 'ALL', 0);
    await searchUnified('한글', 'NOTICE', 10);
    expect(api.apiGet).toHaveBeenNthCalledWith(1,
      `/api/v1/search?${new URLSearchParams({ keyword: '한글 & 공지', type: 'ALL', offset: '0', limit: '5' })}`);
    expect(api.apiGet).toHaveBeenNthCalledWith(2,
      `/api/v1/search?${new URLSearchParams({ keyword: '한글', type: 'NOTICE', offset: '10', limit: '10' })}`);
  });

  it('exposes an inline header field and submits directly to the result page without a dialog', async () => {
    setup();
    expect(screen.getByLabelText('통합검색 검색어')).toBeVisible();
    submit('a');
    expect(api.apiGet).not.toHaveBeenCalled();
    expect(screen.getByLabelText('통합검색 검색어')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('검색어는 2~100자로 입력해 주세요.')).not.toBeInTheDocument();
    submit(' 검색 ');
    await screen.findByRole('tab', { name: '전체 25' });
    expect(screen.getByTestId('location')).toHaveTextContent('/search?keyword=%EA%B2%80%EC%83%89&type=ALL&page=1');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '통합검색 결과' })).toBeVisible();
    expect(screen.getByLabelText('통합검색 검색어')).toHaveValue('검색');
    expect(document.querySelector('mark')).toHaveTextContent('검색');
  });

  it('highlights case-insensitive query matches in result descriptions as text', async () => {
    const data = response('SEARCH result');
    data.item.groups[0].items[0].description =
      'matching SEARCH phrase <script>alert(1)</script>';
    api.apiGet.mockResolvedValue(data);
    setup('/search?keyword=search&type=ALL&page=1');

    expect(await screen.findByRole('button', { name: /SEARCH result MENU/ })).toBeVisible();
    const description = await screen.findByText(
      (_, element) =>
        element?.tagName === 'P' &&
        element.textContent === 'matching SEARCH phrase <script>alert(1)</script>',
    );
    expect(within(description).getByText('SEARCH', { selector: 'mark' })).toBeVisible();
    expect(description.querySelector('script')).toBeNull();
    expect(description).toHaveTextContent('<script>alert(1)</script>');
  });

  it('preserves aggregate counts when switching to a category and paging by URL', async () => {
    setup('/search?keyword=공지&type=ALL&page=1');
    await screen.findByRole('tab', { name: '전체 25' });
    fireEvent.change(screen.getByLabelText('통합검색 검색어'), { target: { value: '미제출' } });
    fireEvent.click(screen.getByRole('button', { name: '공지 더보기' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: '공지 23' })).toHaveAttribute('aria-selected', 'true'));
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await screen.findByText('2페이지');
    expect(screen.getByTestId('location')).toHaveTextContent('type=NOTICE&page=2');
    expect(api.apiGet.mock.calls.some(([url]) => url.includes('offset=10') && !url.includes('미제출'))).toBe(true);
    expect(screen.getByRole('tab', { name: '전체 25' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
    await screen.findByText('1페이지');
    expect(screen.getByLabelText('통합검색 검색어')).toHaveValue('공지');
  });

  it('restores a direct category/page URL and resets a new search to all results', async () => {
    setup('/search?keyword=이전&type=NOTICE&page=2');
    await screen.findByText('2페이지');
    expect(screen.getByLabelText('결과 검색어')).toHaveValue('이전');
    fireEvent.change(screen.getByLabelText('결과 검색어'), { target: { value: '새 검색' } });
    fireEvent.click(screen.getByRole('button', { name: '다시 검색' }));
    await screen.findByRole('tab', { name: '전체 25' });
    expect(screen.getByTestId('location')).toHaveTextContent('type=ALL&page=1');
    expect(screen.getByLabelText('통합검색 검색어')).toHaveValue('새 검색');
  });

  it('ignores a previous keyword response after navigating to a new search', async () => {
    let resolveFirst!: (value: ReturnType<typeof response>) => void;
    api.apiGet.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    setup('/search?keyword=이전&type=ALL&page=1');
    submit('최신');
    await screen.findByRole('button', { name: /최신 MENU/ });
    await act(async () => { resolveFirst(response('옛 결과')); });
    expect(screen.queryByText('옛 결과 MENU')).not.toBeInTheDocument();
  });

  it('shows errors and retries without reporting failed searches as zero results', async () => {
    api.apiGet.mockRejectedValueOnce(new Error('조회 실패'));
    setup('/search?keyword=공지&type=ALL&page=1');
    expect(await screen.findByRole('alert')).toHaveTextContent('조회 실패');
    expect(screen.queryByRole('tab', { name: '전체 0' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '재시도' }));
    await screen.findByRole('tab', { name: '전체 25' });
  });

  it('shows an explicit empty state per category', async () => {
    api.apiGet.mockResolvedValue({ item: { groups: response().item.groups.map((group) => ({
      ...group, items: [], totalCount: 0,
    })) } });
    setup('/search?keyword=없음&type=ALL&page=1');
    const region = await screen.findByRole('region', { name: '메뉴 검색 결과' });
    expect(within(region).getByText('검색 결과가 없습니다.')).toBeVisible();
    expect(screen.getByRole('tab', { name: '전체 0' })).toBeVisible();
  });

  it('refreshes results when the same keyword is explicitly submitted again', async () => {
    setup('/search?keyword=검색&type=ALL&page=1');
    await screen.findByRole('tab', { name: '전체 25' });
    const calls = api.apiGet.mock.calls.length;
    submit('검색');
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledTimes(calls + 1));
  });

  it('moves between category tabs with the keyboard', async () => {
    setup('/search?keyword=검색');
    const allTab = await screen.findByRole('tab', { name: '전체 25' });
    act(() => { allTab.focus(); });
    fireEvent.keyDown(allTab, { key: 'End' });
    await waitFor(() => expect(screen.getByRole('tab', { name: '공지 23' })).toHaveAttribute('aria-selected', 'true'));
    expect(screen.getByRole('tab', { name: '공지 23' })).toHaveFocus();
  });

  it('restores the header keyword for a trailing-slash search URL', async () => {
    setup('/search/?keyword=검색');
    await screen.findByRole('tab', { name: '전체 25' });
    expect(screen.getByLabelText('통합검색 검색어')).toHaveValue('검색');
  });

  it.each([
    '/search?keyword=a',
    '/search?keyword=검색&type=UNKNOWN',
    '/search?keyword=검색&type=NOTICE&page=-1',
    '/search?keyword=검색&type=NOTICE&page=1002',
    '/search?keyword=검색&type=ALL&page=2',
  ])('does not query invalid URL conditions: %s', async (entry) => {
    setup(entry);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(api.apiGet).not.toHaveBeenCalled();
  });

  it.each(['https://example.com', '//example.com', '/\\example.com', '/menu\n'])(
    'does not navigate to an unsafe result path: %j',
    async (path) => {
      api.apiGet.mockResolvedValue(response('잘못된 경로', path));
      setup('/search?keyword=검색');
      fireEvent.click(await screen.findByRole('button', { name: /잘못된 경로 MENU/ }));
      expect(screen.getByRole('alert')).toHaveTextContent('이동 경로');
      expect(screen.getByTestId('location')).toHaveTextContent('/search?keyword=');
    },
  );

  it('opens a selected result in its existing detail route', async () => {
    setup('/search?keyword=검색');
    fireEvent.click(await screen.findByRole('button', { name: /검색 NOTICE/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/groupware/community/notice?dashboardPostId=21');
  });
});
