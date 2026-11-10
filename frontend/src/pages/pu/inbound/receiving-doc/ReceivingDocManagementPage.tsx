import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { docDetailValues } from '../receiving-register/utils/receiving';
import { DocDetailDialog, DocUploadDialog, DocViewDialog } from './components/ReceivingDocDialogs';
import { ReceivingDocGrid, createReceivingDocColumns } from './components/ReceivingDocGrid';
import { useReceivingDocs } from './hooks/useReceivingDocs';

type ReceivingDocManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };

// 상세 조회(⌄): 입고일(필수, 이번 달 1일 ~ 오늘로 시작) · 거래처코드/명
const DETAIL_FIELDS: PageSearchField[] = [
  { field: 'receiveDate', label: '입고일', type: 'date', searchSpan: 2, required: true },
  { field: 'clientQ', label: '거래처코드/명', type: 'text', searchSpan: 1 },
];

// 구매관리 > 입고관리 > 서류등록 (화면ID IBReceivingDocView, 송연 #screen-recv 서류 탭 · 19-purchase.js)
// 품목별로 묶어 보고, 입고 건마다 거래명세서 같은 서류를 붙인다.
// 2026-11-03 입고관리 탭에서 화면으로 나눴다. 검색줄은 원재료코드/명, 나머지는 상세 조회.
export function ReceivingDocManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ReceivingDocManagementPageProps) {
  const [alertText, setAlertText] = useState<string | null>(null);
  const docs = useReceivingDocs(setAlertText);
  const { setUploadTarget, setViewTarget, openDetail } = docs;
  const columns = useMemo(
    () => createReceivingDocColumns({ onUpload: setUploadTarget, onView: setViewTarget, onDetail: openDetail }),
    [setUploadTarget, setViewTarget, openDetail],
  );
  // 상세 조회(⌄): 고치는 중인 값(detailValues)과 [조회]로 적용한 값(조건 칩)
  const { start, end, clientQ } = docs.query;
  const appliedDetailValues = useMemo<Record<string, PageSearchFieldValue>>(
    () => docDetailValues({ start, end, clientQ, materialQ: '' }),
    [start, end, clientQ],
  );
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(appliedDetailValues);
  useEffect(() => setDetailValues(appliedDetailValues), [appliedDetailValues]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: Boolean(selectedMenuPermissions?.read),
          disabled: docs.loading,
          onClick: () => void docs.load(),
        },
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void docs.exportExcel(),
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
      <PageSearchArea
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="원재료코드/명 검색"
            value={docs.query.materialQ}
            onChange={(event) => docs.changeMaterial(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '원재료코드/명 검색' } }}
            sx={(theme) => ({ width: '100%', ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void docs.load()}
        detailFields={DETAIL_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={docs.applyDetail}
        detailLoading={docs.loading}
      />
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <FormControlLabel
              sx={{ ml: 'auto', mr: 0 }}
              control={<Checkbox size="small" checked={docs.missingOnly} onChange={(event) => docs.setMissingOnly(event.target.checked)} />}
              label={<Typography variant="body2">서류 없는 품목만 보기</Typography>}
            />
          </Box>
          <ReceivingDocGrid rows={docs.rows} columns={columns} loading={docs.loading} />
        </Card>
      </Box>
      <DocUploadDialog
        open={docs.uploadTarget != null}
        materialName={docs.uploadTarget?.name ?? ''}
        rows={docs.uploadRows}
        onClose={() => docs.setUploadTarget(null)}
        onChanged={docs.refreshFiles}
      />
      <DocViewDialog
        open={docs.viewTarget != null}
        materialName={docs.viewTarget?.name ?? ''}
        rows={docs.viewRows}
        onClose={() => docs.setViewTarget(null)}
      />
      <DocDetailDialog
        target={docs.detailTarget}
        start={docs.detailQuery.start}
        end={docs.detailQuery.end}
        clientQ={docs.detailQuery.clientQ}
        onClose={() => docs.setDetailTarget(null)}
      />
      <ConfirmDialog
        open={alertText != null}
        title="서류등록"
        message={alertText ?? ''}
        alertOnly
        onCancel={() => setAlertText(null)}
        onConfirm={() => setAlertText(null)}
      />
    </Box>
  );
}
