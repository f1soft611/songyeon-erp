import { useMemo, useState } from 'react';
import { Box, Card, TextField } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PageSearchField } from '../../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { LabelFormDialog, type LabelFormTarget } from './components/LabelFormDialog';
import { LabelCompanyDialog } from './components/LabelSideDialogs';
import { LabelRegisterGrid, createLabelRegisterColumns } from './components/LabelRegisterGrid';
import { LABEL_CARD_SX, searchFieldSx } from './components/labelGridParts';
import { useLabelRegister } from './hooks/useLabelRegister';

type LabelRegisterManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 상세 조회(⌄): 라벨 상태(빈 값 = 전체)
const DETAIL_FIELDS: PageSearchField[] = [
  {
    field: 'labelState',
    label: '라벨 상태',
    type: 'select',
    searchSpan: 1,
    options: [
      { value: 'done', label: '등록된 것만' },
      { value: 'todo', label: '아직 안된 것만' },
    ],
  },
];

// 품질관리 > 라벨관리 > 라벨등록 (화면ID LBLabelRegisterView, 송연 #screen-label-register · 25-label-register.js · 07-label.js)
// 제품에 붙일 표시사항을 등록한다. 라벨은 한 제품에 한 장이며, 고쳐도 이전 내용이 버전으로 남는다.
// 2026-11-05 라벨등록의 탭(표시사항 요청 · 라벨양식)을 화면으로 나눴다. 검색줄은 제품명/제품코드(서버 조회), 라벨 상태는 상세 조회
export function LabelRegisterManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: LabelRegisterManagementPageProps) {
  const register = useLabelRegister();
  const [formTarget, setFormTarget] = useState<LabelFormTarget | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const columns = useMemo(() => createLabelRegisterColumns({ onRegister: (row) => setFormTarget({ code: row.code, name: row.name || '' }) }), []);

  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    { key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: register.loading, onClick: register.search }] },
    { key: 'write', actions: [{ label: '회사 고정정보 설정', icon: BusinessIcon, visible: canWrite, onClick: () => setCompanyOpen(true) }] },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="제품명 또는 제품코드 검색"
            value={register.q}
            onChange={(event) => register.setQ(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '제품명 또는 제품코드 검색' } }}
            sx={searchFieldSx}
          />
        }
        onDefaultSearch={register.search}
        detailFields={DETAIL_FIELDS}
        detailValues={register.detailValues}
        appliedDetailValues={register.detail}
        onDetailValuesChange={register.setDetailValues}
        onDetailSearch={register.applyDetail}
        detailLoading={register.loading}
      />
      {register.loaded && !register.loading && <SearchResultMessage resultCount={register.rows.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={LABEL_CARD_SX}>
          <LabelRegisterGrid rows={register.rows} columns={columns} loading={register.loading} />
        </Card>
      </Box>
      <LabelFormDialog target={formTarget} onClose={() => setFormTarget(null)} onSaved={register.search} />
      <LabelCompanyDialog open={companyOpen} onClose={() => setCompanyOpen(false)} />
    </Box>
  );
}
