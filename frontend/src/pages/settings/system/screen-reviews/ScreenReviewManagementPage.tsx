import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type { ReviewStatus } from '../../../../shared/components/screen-review/screenReview.types';
import { todayDash } from '../../../../shared/utils/excelFile';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ScreenReviewSummaryCards } from './components/ScreenReviewSummaryCards';
import { ScreenReviewTree } from './components/ScreenReviewTree';
import { fetchScreenReviewSummaries } from './services/screenReviewManagement.service';
import {
  SUMMARY_STATUS_LABELS,
  SUMMARY_STATUS_ORDER,
  countByStatus,
  developerOptions,
  filterSummaries,
  moduleOptions,
  toTreeRows,
} from './screenReviewManagement';
import type { ScreenReviewSummary } from './types/screenReviewManagement.types';

type ScreenReviewManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

type DetailFilter = { moduleCode: string; status: ReviewStatus | ''; developer: string };

const EMPTY_DETAIL: DetailFilter = { moduleCode: '', status: '', developer: '' };

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

const errorText = (error: unknown) => (error instanceof Error && error.message ? error.message : '화면검수 목록을 불러오지 못했어요');

// 환경설정 > 시스템 관리 > 화면검수 관리 (화면ID ST_SCREEN_REVIEWS, 2026-11-05)
// 모든 화면의 검수 상태를 본다(보기 전용). 상태는 각 화면의 [화면검수] 패널에서 바꾼다.
// 카드 건수는 화면 수이고 검색과 상관없이 전체 기준. 검색줄은 화면명/화면코드, 상세 조회(⌄)는 구분 · 상태 · 담당자
export function ScreenReviewManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ScreenReviewManagementPageProps) {
  const requestRef = useRef(0);
  const [summaries, setSummaries] = useState<ScreenReviewSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [baseDate, setBaseDate] = useState(todayDash());
  const [alertText, setAlertText] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [detail, setDetail] = useState<DetailFilter>(EMPTY_DETAIL);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(EMPTY_DETAIL);

  // 마지막 요청의 응답만 쓴다
  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const list = await fetchScreenReviewSummaries();
      if (requestId !== requestRef.current) return;
      setSummaries(list);
      setBaseDate(todayDash());
    } catch (requestError) {
      if (requestId === requestRef.current) setAlertText(errorText(requestError));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const all = useMemo(() => summaries ?? [], [summaries]);
  const counts = useMemo(() => countByStatus(all), [all]);
  const filtered = useMemo(() => filterSummaries(all, { keyword, ...detail }), [all, keyword, detail]);
  const treeRows = useMemo(() => toTreeRows(filtered), [filtered]);

  const detailFields = useMemo<PageSearchField[]>(() => [
    { field: 'moduleCode', label: '구분', type: 'select', searchSpan: 1, options: moduleOptions(all) },
    {
      field: 'status',
      label: '상태',
      type: 'select',
      searchSpan: 1,
      options: SUMMARY_STATUS_ORDER.map((status) => ({ value: status, label: SUMMARY_STATUS_LABELS[status] })),
    },
    { field: 'developer', label: '담당자', type: 'select', searchSpan: 1, options: developerOptions(all) },
  ], [all]);
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(() => ({ ...detail }), [detail]);

  const applyDetail = (values: Record<string, PageSearchFieldValue>) => {
    const next: DetailFilter = {
      moduleCode: String(values.moduleCode ?? ''),
      status: String(values.status ?? '') as ReviewStatus | '',
      developer: String(values.developer ?? ''),
    };
    setDetail(next);
    setDetailValues(next);
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: loading,
          onClick: () => void load(),
        },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <ScreenReviewSummaryCards counts={counts} baseDate={baseDate} />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="화면명 또는 화면코드 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '화면명 또는 화면코드 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void load()}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={applyDetail}
        detailLoading={loading}
      />
      {summaries && !loading && <SearchResultMessage resultCount={filtered.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <ScreenReviewTree rows={treeRows} loading={loading} />
        </Card>
      </Box>
      <ConfirmDialog
        open={alertText != null}
        title="화면검수 관리"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}
