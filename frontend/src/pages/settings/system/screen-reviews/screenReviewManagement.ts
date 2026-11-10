import type { ReviewStatus } from '../../../../shared/components/screen-review/screenReview.types';
import type {
  ScreenReviewCounts,
  ScreenReviewFilter,
  ScreenReviewSummary,
  ScreenReviewTreeRow,
} from './types/screenReviewManagement.types';

// 화면검수 관리: 이 화면에서는 이력이 없는 화면을 '미진행'으로 부른다(패널의 '미검수'와 같은 값)
export const SUMMARY_STATUS_LABELS: Record<ReviewStatus, string> = {
  COMPLETED: '검수완료',
  IN_PROGRESS: '검수진행중',
  CHANGE_REQUESTED: '수정요청',
  NOT_STARTED: '미진행',
};

export const SUMMARY_STATUS_ORDER: ReviewStatus[] = ['COMPLETED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'NOT_STARTED'];

// 건수는 화면 수(한 화면에 수정요청이 여러 번이어도 1)
export function countByStatus(rows: ScreenReviewSummary[]): ScreenReviewCounts {
  const counts: ScreenReviewCounts = { total: rows.length, COMPLETED: 0, IN_PROGRESS: 0, CHANGE_REQUESTED: 0, NOT_STARTED: 0 };
  rows.forEach((row) => {
    counts[row.displayStatus] += 1;
  });
  return counts;
}

// 비율(소수 없이 반올림). 전체가 0 이면 0
export const percentOf = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

export function filterSummaries(rows: ScreenReviewSummary[], filter: ScreenReviewFilter): ScreenReviewSummary[] {
  const keyword = filter.keyword.trim().toLowerCase();
  return rows.filter((row) => {
    if (keyword && !row.menuName.toLowerCase().includes(keyword) && !row.menuCode.toLowerCase().includes(keyword)) return false;
    if (filter.moduleCode && row.moduleCode !== filter.moduleCode) return false;
    if (filter.status && row.displayStatus !== filter.status) return false;
    if (filter.developer && (row.developerName ?? '') !== filter.developer) return false;
    return true;
  });
}

// 모듈 묶음 줄 + 화면 줄. 받은 순서(모듈 → 중분류 → 화면)를 지키고, 화면이 없는 모듈은 만들지 않는다
export function toTreeRows(rows: ScreenReviewSummary[]): ScreenReviewTreeRow[] {
  const modules = new Map<string, { name: string; screens: ScreenReviewSummary[] }>();
  rows.forEach((row) => {
    const group = modules.get(row.moduleCode) ?? { name: row.moduleName, screens: [] };
    group.screens.push(row);
    modules.set(row.moduleCode, group);
  });
  const result: ScreenReviewTreeRow[] = [];
  modules.forEach((group, moduleCode) => {
    const moduleId = `module:${moduleCode}`;
    result.push({
      id: moduleId, parentId: null, isModule: true, category: `${group.name} (${group.screens.length})`,
      menuName: null, menuCode: null, developerName: null, reviewDate: null, displayStatus: null, lastComment: null, order: result.length,
    });
    group.screens.forEach((screen) => {
      result.push({
        id: `menu:${screen.menuCode}`, parentId: moduleId, isModule: false, category: screen.groupName ?? '',
        menuName: screen.menuName, menuCode: screen.menuCode, developerName: screen.developerName,
        reviewDate: screen.reviewDate, displayStatus: screen.displayStatus, lastComment: screen.lastComment,
        order: result.length,
      });
    });
  });
  return result;
}

// 고를 수 있는 구분(모듈) · 담당자
export function moduleOptions(rows: ScreenReviewSummary[]) {
  const seen = new Map<string, string>();
  rows.forEach((row) => { if (!seen.has(row.moduleCode)) seen.set(row.moduleCode, row.moduleName); });
  return Array.from(seen, ([value, label]) => ({ value, label }));
}

export function developerOptions(rows: ScreenReviewSummary[]) {
  return Array.from(new Set(rows.map((row) => row.developerName ?? '').filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .map((name) => ({ value: name, label: name }));
}
