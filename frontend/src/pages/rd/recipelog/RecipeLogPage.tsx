import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Card, Chip, Tab, Tabs, TextField, Typography } from '@mui/material';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { fetchHandoffs } from './services/recipeLog.service';
import { LOG_KINDS, emptyText, handoffTime, quoteGone, summaryText, type RecipeHandoff } from './utils/recipeLog';

type RecipeLogPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};
type LogRow = RecipeHandoff & { key: string };

const tag = (label: string, color: 'success' | 'warning') => <Chip size="small" color={color} label={label} sx={{ height: 20, fontSize: 11 }} />;

// 상품개발 > 레시피 공유 로그 (송연 #screen-recipe-log · 09-recipe.js 644~711)
// 예전에 있던 '받는 쪽이 열어봤는지'(확인) 칸은 송연에서 걷어냈다 — 열어본 것과 일을 처리한 것이 달라 넘긴 쪽이 오히려 안심하게 됐다.
export function RecipeLogPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
}: RecipeLogPageProps) {
  const [kind, setKind] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  // 조회한 기간(요약·빈 문구는 실제로 조회한 기간으로 말한다)
  const [shown, setShown] = useState({ start: '', end: '' });
  const [rows, setRows] = useState<RecipeHandoff[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (k: string, s: string, e: string) => {
    setLoading(true);
    try {
      setRows(await fetchHandoffs({ kind: k, start: s, end: e }));
    } catch {
      setRows([]);
    } finally {
      setShown({ start: s, end: e });
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load('', '', '');
  }, [load]);

  const switchKind = (k: string) => {
    setKind(k);
    void load(k, start, end);
  };
  // 기간을 비우면 전부 본다. 언제 넘겼는지 기억이 안 날 때 쓰는 자리라 기본은 넉넉히 잡는다
  const allPeriod = () => {
    setStart('');
    setEnd('');
    void load(kind, '', '');
  };

  const logRows = useMemo<LogRow[]>(() => rows.map((r) => ({ ...r, key: `h${r.id}` })), [rows]);
  const columns: F1GridColumn<LogRow>[] = [
    { field: 'key', type: 'rownumber', width: 60, headerName: '순번', headerAlign: 'center', align: 'center', pinned: 'left' },
    {
      field: 'createdAt', headerName: '공유한 날짜', width: 150, headerAlign: 'center', align: 'center',
      renderCell: ({ row }) => <Box component="span" sx={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}>{handoffTime(row.createdAt)}</Box>,
    },
    {
      field: 'requestedByName', headerName: '공유한 사람', width: 160, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box component="span">
          {row.requestedByName || ''}
          {row.requestedByUsername && <Box component="span" sx={{ ml: 0.75, fontSize: 11.5, color: 'text.secondary' }}>({row.requestedByUsername})</Box>}
        </Box>
      ),
    },
    { field: 'clientName', headerName: '업체명', width: 160, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.clientName || '' },
    { field: 'draftName', headerName: '레시피명', flex: 1, width: 220, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.draftName || '(삭제된 레시피)' },
    { field: 'versionLabel', headerName: '버전', width: 100, headerAlign: 'center', align: 'left', renderCell: ({ row }) => row.versionLabel || '' },
    {
      field: 'kind', headerName: '처리구분', width: 170, headerAlign: 'center', align: 'left',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {tag(row.kind || '', 'success')}
          {quoteGone(row) && tag('견적 없어짐', 'warning')}
        </Box>
      ),
    },
  ];

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'search',
      actions: [
        { label: '조회', icon: SearchIcon, visible: true, onClick: () => void load(kind, start, end) },
        { label: '전체 기간', icon: DateRangeIcon, visible: true, onClick: allPeriod },
      ],
    },
  ];

  const dateInput = (value: string, set: (v: string) => void, label: string) => (
    <TextField
      size="small" margin="none" type="date" value={value} sx={{ width: 160 }}
      onChange={(event) => set(event.target.value)}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void load(kind, start, end); } }}
      slotProps={{ htmlInput: { max: '9999-12-31', 'aria-label': label } }}
    />
  );

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={kind} onChange={(_event, value: string) => switchKind(value)} aria-label="처리구분 탭">
          {LOG_KINDS.map((k) => <Tab key={k.label} value={k.value} label={k.label} />)}
        </Tabs>
      </Box>
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {dateInput(start, setStart, '시작일')}
            <Box component="span" sx={{ color: 'text.secondary' }}>~</Box>
            {dateInput(end, setEnd, '종료일')}
            <Typography role="status" variant="body2" color="text.secondary" sx={{ ml: 1 }}>{loaded ? summaryText(shown.start, shown.end, rows.length) : ''}</Typography>
          </Box>
          {loaded && !loading && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{emptyText(shown.start, shown.end)}</Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden' }}>
            <F1Grid
              rows={logRows} columns={columns} rowKey="key" storageKey="rd-recipe-log-grid" ariaLabel="F1-GRID 레시피 공유 로그" loading={loading}
              height="100%" maxHeight="100%" rowHeight={38} minRowHeight={38} maxRowHeight={320} columnLine showCheckbox={false}
              resizableRows={false} allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
