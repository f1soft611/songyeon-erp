import { useMemo, useState } from 'react';
import { Box, Card, CardContent, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
// 제품 상세 창(배합비 · 부자재)은 제품마스터와 같이 쓴다
import { ProductBomDialog } from '../item-master/components/ProductBomDialog';
import { ProductBomHistoryDialog } from '../item-master/components/ProductBomHistoryDialog';
import { PartnerItemGrid, createPartnerItemColumns } from './components/PartnerItemGrid';
import { filterClientProducts, usePartnerItemManagement } from './hooks/usePartnerItemManagement';
import type { PartnerItemRow } from './types/partnerItem.types';

// 조회 칸 모양(제품마스터 · 거래처마스터와 같음)
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

type PartnerItemManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 공통관리 > 기초정보 > 거래처별 제품조회 (화면ID BSPartnerItemView, 송연 기초정보 탭 CM0001Tab07)
// 송연: 보기 전용(제목줄: 조회). 거래처코드 · 거래처명을 적어야 그 거래처의 제품을 보여주고, 상세는 [상세] 칸 → 제품BOM 창
// 2026-10-27 S_ERP 거래처관리와 같은 구조로 나눴다: 화면(이 파일) · 조회(hooks/usePartnerItemManagement) · 그리드(components/PartnerItemGrid)
export function PartnerItemManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: PartnerItemManagementPageProps) {
  const management = usePartnerItemManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [detail, setDetail] = useState<PartnerItemRow | null>(null);
  const [history, setHistory] = useState<PartnerItemRow | null>(null);

  const permissions = {
    read: Boolean(selectedMenuPermissions?.read),
    write: Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update),
    excel: Boolean(selectedMenuPermissions?.excel),
  };
  const columns = useMemo(() => createPartnerItemColumns(setDetail, setHistory), []);
  const visibleRows = useMemo(() => filterClientProducts(management.rows, searchQuery), [management.rows, searchQuery]);

  // 송연 빈 목록 문구: 검색어가 없을 때와 맞는 제품이 없을 때를 나눠 알린다
  const query = searchQuery.trim();
  const notice = !query
    ? '거래처코드나 거래처명을 입력해서 검색해주세요'
    : !management.loading && visibleRows.length === 0
      ? '해당 거래처의 등록된 제품이 없습니다'
      : '';

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '조회', icon: SearchIcon, visible: permissions.read, disabled: management.loading, onClick: () => void management.reload() },
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
      {/* 조회 조건: 거래처코드 · 거래처명(돋보기 칸, 바로 거름) */}
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="거래처코드/거래처명 검색"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '거래처코드/거래처명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void management.reload()}
      />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} />
      <Box sx={{ p: { xs: 1.5, sm: 1 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1, '&:last-child': { pb: 2 } }}>
            {notice && (
              <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                {notice}
              </Typography>
            )}
            <PartnerItemGrid
              rows={visibleRows}
              columns={columns}
              canExportExcel={permissions.excel}
              loading={management.loading}
              gridKey={management.gridKey}
            />
          </CardContent>
        </Card>
      </Box>
      {detail && (
        <ProductBomDialog
          key={detail.code}
          product={detail}
          initialTab="view"
          canWrite={permissions.write}
          onSaved={() => management.reload()}
          onClose={() => setDetail(null)}
        />
      )}
      {history && <ProductBomHistoryDialog product={history} onClose={() => setHistory(null)} />}
    </Box>
  );
}
