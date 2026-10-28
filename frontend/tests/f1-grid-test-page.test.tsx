import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { F1GridTestPage } from '../src/pages/settings/system/f1-grid-test/F1GridTestPage';
import {
  moduleItems,
  pageContentMap,
} from '../src/pages/dashboard/services/dashboardData';

describe('F1 Grid test page', () => {
  it('registers the F1 Grid test menu and renders its full options grid and toolbar', () => {
    expect(
      moduleItems.find((module) => module.id === 'settings')?.menus,
    ).toContainEqual(
      expect.objectContaining({
        name: 'F1 Grid 테스트',
        pageKey: 'f1-grid-test',
      }),
    );

    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    // Verify grid & action buttons
    expect(
      screen.getByRole('grid', { name: 'F1-GRID 기능 테스트' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '행 추가' })).toBeVisible();
    expect(screen.getByRole('button', { name: '행 복제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '행 삭제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '삭제 복구' })).toBeVisible();
    expect(screen.getByRole('button', { name: '선택 해제' })).toBeVisible();
    expect(screen.getByRole('button', { name: '검증 실행' })).toBeVisible();

    // Verify grid options toggles
    expect(screen.getByLabelText('컬럼 구분선')).toBeChecked();
    expect(screen.getByLabelText('행 높이 조절')).toBeChecked();
    expect(screen.getByLabelText('컬럼 너비 리사이즈')).toBeChecked();

    // Verify changes stats chips
    expect(screen.getByText(/추가: 0건/)).toBeVisible();
    expect(screen.getByText(/수정: 0건/)).toBeVisible();
    expect(screen.getByText(/삭제: 0건/)).toBeVisible();
  });

  it('moves the default pinned item code column before unpinned columns', () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    const headerLabels = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())
      .filter((label): label is string => Boolean(label));

    expect(headerLabels.slice(0, 3)).toEqual([
      '품목코드',
      '사용여부',
      '품목명 (Row Merge)',
    ]);
  });

  it('renders a standalone date editor for shortcut input testing', () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    expect(screen.getByText('날짜 입력 테스트')).toBeVisible();
    expect(screen.getByLabelText('축약 입력')).toHaveValue('2026-08-28');
    expect(screen.getByRole('button', { name: '날짜 초기화' })).toBeVisible();
  });

  it('updates item code and patch values through the code picker dialog', async () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    const itemCodeCells = screen.getAllByRole('gridcell', { name: 'ITEM-001' });
    fireEvent.doubleClick(itemCodeCells[0]);
    fireEvent.click(screen.getByRole('button', { name: '코드 선택' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: /ITEM-002: 고내열 실리콘 패킹 가스켓 50A/,
      }),
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole('gridcell', { name: 'ITEM-002' })[0],
      ).toBeVisible();
      expect(
        screen.getAllByRole('gridcell', {
          name: '고내열 실리콘 패킹 가스켓 50A',
        })[0],
      ).toBeVisible();
    });
  });

  it('runs validation and displays success notification', async () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '검증 실행' }));

    await waitFor(() => {
      expect(
        screen.getByText('모든 데이터 검증을 통과하였습니다.'),
      ).toBeVisible();
    });
  });

  it('supports adding and duplicating rows through toolbar', async () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '행 추가' }));

    await waitFor(() => {
      expect(screen.getByText(/추가: 1건/)).toBeVisible();
    });
  });

  it('renders a long wrap-text sample with row height controls', () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    expect(screen.getAllByText(/원통형 스테인리스 배관 부품/)[0]).toBeVisible();
    const rowHeightHandles = screen.getAllByRole('button', {
      name: /행 높이 조절/,
    });

    expect(rowHeightHandles[0]).toHaveAttribute('aria-valuenow', '32');

    fireEvent.keyDown(rowHeightHandles[0], { key: 'ArrowDown' });

    expect(rowHeightHandles[0]).toHaveAttribute('aria-valuenow', '36');
  });

  it('provides column resize handles on all column headers', () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    expect(
      screen.getByRole('separator', { name: '품목코드 컬럼 너비 조절' }),
    ).toBeVisible();
    expect(
      screen.getByRole('separator', {
        name: '품목명 (Row Merge) 컬럼 너비 조절',
      }),
    ).toBeVisible();
  });

  it('shows the normalized result after entering a date shortcut', async () => {
    render(
      <F1GridTestPage
        selectedModule={moduleItems.find((module) => module.id === 'settings')!}
        currentMenuName="F1 Grid 테스트"
        content={pageContentMap['f1-grid-test']}
      />,
    );

    const dateInput = screen.getByLabelText('축약 입력');
    fireEvent.change(dateInput, { target: { value: '0701' } });

    await waitFor(() => {
      expect(screen.getByText('2026-07-01')).toBeVisible();
    });
  });
});
