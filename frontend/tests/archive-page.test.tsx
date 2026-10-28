import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import dayjs from 'dayjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import type { MenuPermission, ModuleItem } from '../src/pages/dashboard/types/dashboard';
import { pageContentMap } from '../src/pages/dashboard/services/dashboardData';

const archiveServices = vi.hoisted(() => ({
  fetchArchiveFiles: vi.fn(),
  uploadArchiveFile: vi.fn(),
  updateArchiveFile: vi.fn(),
  deleteArchiveAttachment: vi.fn(),
  downloadArchiveAttachment: vi.fn(),
  fetchCommonCodeGroups: vi.fn(),
  fetchCommonCodeItems: vi.fn(),
  createCommonCodeItem: vi.fn(),
  updateCommonCodeItem: vi.fn(),
}));

vi.mock(
  '../src/pages/groupware/community/archive/services/archiveBoardService',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../src/pages/groupware/community/archive/services/archiveBoardService')
    >()),
    fetchArchiveFiles: archiveServices.fetchArchiveFiles,
    uploadArchiveFile: archiveServices.uploadArchiveFile,
    updateArchiveFile: archiveServices.updateArchiveFile,
    deleteArchiveAttachment: archiveServices.deleteArchiveAttachment,
    downloadArchiveAttachment: archiveServices.downloadArchiveAttachment,
  }),
);

vi.mock(
  '../src/pages/co/master/common-code/services/commonCodeManagement.service',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../src/pages/co/master/common-code/services/commonCodeManagement.service')
    >()),
    fetchCommonCodeGroups: archiveServices.fetchCommonCodeGroups,
    fetchCommonCodeItems: archiveServices.fetchCommonCodeItems,
    createCommonCodeItem: archiveServices.createCommonCodeItem,
    updateCommonCodeItem: archiveServices.updateCommonCodeItem,
  }),
);

const moduleItem: ModuleItem = {
  id: 'groupware',
  name: '그룹웨어',
  icon: null,
  tree: [],
  menus: [],
};

const adminPermissions: MenuPermission = {
  read: true,
  create: true,
  update: true,
  delete: true,
};

function renderArchive(
  permissions: MenuPermission = adminPermissions,
  isTenantAdmin = true,
) {
  return render(
    <DashboardContent
      selectedModule={moduleItem}
      currentMenuName="자료실"
      currentPageKey="archive"
      breadcrumbItems={['그룹웨어', '자료실']}
      content={
        pageContentMap.archive ?? {
          title: '자료실',
          description: '자료실 설명',
          cards: [],
          items: [],
        }
      }
      selectedMenuPermissions={permissions}
      isTenantAdmin={isTenantAdmin}
    />,
  );
}

describe('Archive dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    archiveServices.fetchArchiveFiles.mockImplementation(async (filters) => ({
      resultList:
        filters.folderCode === 'OLD'
          ? [
              {
                boardFileId: 55,
                postId: 14,
                fileName: '이전 자료.pdf',
                writerName: '홍길동',
                uploadedAt: '2026-10-15T09:00:00',
                fileSize: 1024,
                categoryCode: 'OLD',
              },
            ]
          : filters.folderCode === 'MANUAL'
            ? []
            : [
                {
                  boardFileId: 31,
                  postId: 12,
                  fileName: '업무 가이드.pdf',
                  writerName: '홍길동',
                  uploadedAt: '2026-10-15T09:00:00',
                  fileSize: 1024,
                  categoryCode: 'GUIDE',
                },
              ],
      resultCnt: filters.folderCode === 'MANUAL' ? 0 : 1,
    }));
    archiveServices.uploadArchiveFile.mockResolvedValue({
      boardFileId: 44,
      postId: 40,
      fileName: 'new-file.pdf',
      writerName: '홍길동',
    });
    archiveServices.updateArchiveFile.mockResolvedValue({
      boardFileId: 31,
      postId: 12,
      fileName: '새 이름.pdf',
      categoryCode: 'MANUAL',
    });
    archiveServices.deleteArchiveAttachment.mockResolvedValue(undefined);
    archiveServices.downloadArchiveAttachment.mockResolvedValue(undefined);
    archiveServices.fetchCommonCodeGroups.mockResolvedValue([
      { id: 8, groupCode: 'WF_ARCHIVE_CATEGORY', useAt: 'Y' },
    ]);
    archiveServices.fetchCommonCodeItems.mockResolvedValue([
      { id: '21', groupId: '8', itemCode: 'GUIDE', itemNm: '업무양식', useAt: 'Y' },
      { id: '22', groupId: '8', itemCode: 'MANUAL', itemNm: '매뉴얼', useAt: 'Y' },
      { id: '23', groupId: '8', itemCode: 'OLD', itemNm: '이전 폴더', useAt: 'N' },
    ]);
    archiveServices.createCommonCodeItem.mockResolvedValue(undefined);
    archiveServices.updateCommonCodeItem.mockResolvedValue(undefined);
  });

  it('renders the folder and file sections with folder navigation', async () => {
    renderArchive();
    expect(await screen.findByRole('grid', { name: '자료실' })).toBeInTheDocument();
    expect(screen.getByText('폴더')).toBeInTheDocument();
    expect(screen.getByText('파일')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '폴더 접기' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '파일 접기' })).toBeInTheDocument();
    expect(await screen.findByText('업무양식')).toBeInTheDocument();
    expect(screen.getByText('매뉴얼')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '업무양식' }));

    await waitFor(() =>
      expect(archiveServices.fetchArchiveFiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ folderCode: 'GUIDE' }),
        expect.any(AbortSignal),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '자료실' }));
    await waitFor(() =>
      expect(archiveServices.fetchArchiveFiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ folderCode: '' }),
        expect.any(AbortSignal),
      ),
    );
  }, 15000);

  it('shows Excel export without root-add in the archive tree context menu', async () => {
    renderArchive();
    const grid = await screen.findByRole('grid', { name: '자료실' });

    fireEvent.contextMenu(grid);

    expect(
      screen.queryByRole('menuitem', { name: '루트 추가' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: '엑셀 내보내기' }),
    ).toBeVisible();
  });

  it('sends keyword search to file-list API', async () => {
    renderArchive();
    const search = await screen.findByRole('textbox', { name: '자료 검색' });
    fireEvent.change(search, { target: { value: '홍길동' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() =>
      expect(archiveServices.fetchArchiveFiles).toHaveBeenLastCalledWith(
        expect.objectContaining({ keyword: '홍길동' }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('initializes detailed date controls and summary to the recent year', async () => {
    renderArchive();
    const today = dayjs().format('YYYY-MM-DD');
    const lastYear = dayjs().subtract(1, 'year').format('YYYY-MM-DD');
    expect(
      await screen.findByLabelText('적용된 날짜: 최근 1년'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '상세 검색 열기' }));

    expect(screen.getByLabelText('올린 날짜 시작일')).toHaveValue(lastYear);
    expect(screen.getByLabelText('올린 날짜 종료일')).toHaveValue(today);
  });

  it('submits date and file type filters from detailed search', async () => {
    renderArchive();
    fireEvent.click(
      await screen.findByRole('button', { name: '상세 검색 열기' }),
    );
    fireEvent.change(screen.getByLabelText('올린 날짜 시작일'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText('올린 날짜 종료일'), {
      target: { value: '2026-10-20' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '유형' }));
    fireEvent.click(await screen.findByRole('option', { name: 'PDF' }));
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() =>
      expect(archiveServices.fetchArchiveFiles).toHaveBeenLastCalledWith(
        expect.objectContaining({
          uploadedFrom: '2026-01-01',
          uploadedTo: '2026-10-20',
          fileType: 'PDF',
        }),
        expect.any(AbortSignal),
      ),
    );
  }, 15000);

  it('opens common-code management for folder creation only when permitted', async () => {
    const first = renderArchive();
    expect(await screen.findByText('업무 가이드.pdf')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '새 폴더' }));

    expect(
      await screen.findByRole('grid', { name: '자료실 폴더 목록' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('분류 정보를 불러오는 중입니다.')).toBeNull(),
    );
    first.unmount();
  });

  it('hides create actions when create permission is absent', async () => {
    renderArchive(
      { read: true, create: false, update: false, delete: false },
      true,
    );
    expect(await screen.findByText('업무 가이드.pdf')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('분류 정보를 불러오는 중입니다.')).toBeNull(),
    );
    expect(screen.queryByRole('button', { name: '파일 업로드' })).toBeNull();
    expect(screen.queryByRole('button', { name: '새 폴더' })).toBeNull();
  });

  it('shows edit and delete actions only for the corresponding permissions', async () => {
    renderArchive({ read: true, create: true, update: false, delete: false });
    expect(await screen.findByRole('grid', { name: '자료실' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '파일 정보 수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });

  it('opens the edit dialog and updates the file name and folder', async () => {
    renderArchive();
    fireEvent.click(await screen.findByRole('button', { name: '파일 정보 수정' }));
    fireEvent.change(screen.getByRole('textbox', { name: '파일명' }), {
      target: { value: '새 이름.pdf' },
    });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '저장 폴더' }));
    fireEvent.click(await screen.findByRole('option', { name: '매뉴얼' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(archiveServices.updateArchiveFile).toHaveBeenCalledWith(
        31,
        { postId: 12, fileName: '새 이름.pdf', folderCode: 'MANUAL' },
      ),
    );
  }, 15000);

  it('keeps files in inactive folders downloadable and read-only', async () => {
    renderArchive();
    fireEvent.click(await screen.findByRole('button', { name: '이전 폴더' }));

    expect(await screen.findByText('이전 자료.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다운로드' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '파일 정보 수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });

  it('confirms a file deletion before sending the request', async () => {
    renderArchive();
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
    expect(
      await screen.findByRole('dialog', { name: '자료 삭제 확인' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));

    await waitFor(() =>
      expect(archiveServices.deleteArchiveAttachment).toHaveBeenCalledWith(31, 12),
    );
  });

  it('opens file picker and uploads selected files immediately', async () => {
    renderArchive();
    const upload = await screen.findByLabelText('자료 파일 선택');
    const first = new File(['first'], 'first.pdf', { type: 'application/pdf' });
    const second = new File(['second'], 'second.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(upload, { target: { files: [first, second] } });

    await waitFor(() =>
      expect(archiveServices.uploadArchiveFile).toHaveBeenCalledTimes(2),
    );
    expect(archiveServices.uploadArchiveFile).toHaveBeenNthCalledWith(
      1,
      first,
      undefined,
    );
    expect(archiveServices.uploadArchiveFile).toHaveBeenNthCalledWith(
      2,
      second,
      undefined,
    );
  });
});
