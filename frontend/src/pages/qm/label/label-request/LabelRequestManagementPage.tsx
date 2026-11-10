import { useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PageSearchField } from '../../../../shared/components/page-search/searchFields';
import { useAsk } from '../../../../shared/components/AskDialog/useAsk';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { LabelFormDialog, type LabelFormTarget } from '../label-register/components/LabelFormDialog';
import { RequestMoveDialog } from '../label-register/components/LabelSideDialogs';
import { LABEL_CARD_SX, errorText, searchFieldSx } from '../label-register/components/labelGridParts';
import { moveRequest } from '../label-register/services/labelRegister.service';
import type { LabelProductRow } from '../label-register/utils/labelRegister';
import { LabelRequestGrid, createLabelRequestColumns } from './components/LabelRequestGrid';
import { useLabelRequests } from './hooks/useLabelRequests';

type LabelRequestManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 상세 조회(⌄): 상태(빈 값 = 전체). 서버가 거른다
const DETAIL_FIELDS: PageSearchField[] = [
  {
    field: 'status',
    label: '상태',
    type: 'select',
    searchSpan: 1,
    options: [
      { value: 'requested', label: '아직 안 끝난 것' },
      { value: 'done', label: '끝난 것' },
    ],
  },
];

// 품질관리 > 라벨관리 > 표시사항 요청 (화면ID LBLabelRequestView, 송연 27-label-request.js)
// 확정 전이라 제품코드가 없는 요청(상품개발에서 넘어옴)에 표시사항을 미리 적어두고, 제품이 등록되면 그 제품의 라벨로 옮긴다.
// 2026-11-05 라벨등록 탭에서 화면으로 나눴다. 검색줄은 업체명/레시피명(받은 목록 안에서 거름), 상태는 상세 조회(빈 값으로 시작)
export function LabelRequestManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: LabelRequestManagementPageProps) {
  const ask = useAsk('표시사항 요청');
  const requests = useLabelRequests();
  const [formTarget, setFormTarget] = useState<LabelFormTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: number; name: string } | null>(null);
  const columns = useMemo(() => createLabelRequestColumns({
    onFill: (row) => setFormTarget({ requestId: row.id, name: row.recipeName || '' }),
    onMove: (row) => setMoveTarget({ id: row.id, name: row.recipeName || '' }),
  }), []);

  const doMove = async (product: LabelProductRow) => {
    if (!moveTarget) return;
    if (!(await ask.confirm(`여기 적어둔 표시사항을 "${product.name || ''}" 의 라벨로 옮길까요?\n옮기고 나면 이 요청은 잠기고, 이후 수정은 라벨등록에서 합니다.`))) return;
    try {
      const result = await moveRequest(moveTarget.id, product.code);
      setMoveTarget(null);
      await ask.alert(`${result.copiedFields}개 항목을 제품 ${result.productCode} 의 라벨로 옮겼습니다.`);
      requests.reload();
    } catch (e) {
      await ask.alert(errorText(e, '옮기지 못했어요'));
    }
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    { key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: requests.loading, onClick: requests.reload }] },
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
            placeholder="업체명/레시피명 검색"
            value={requests.keyword}
            onChange={(event) => requests.setKeyword(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '업체명/레시피명 검색' } }}
            sx={searchFieldSx}
          />
        }
        onDefaultSearch={requests.reload}
        detailFields={DETAIL_FIELDS}
        detailValues={requests.detailValues}
        appliedDetailValues={requests.detail}
        onDetailValuesChange={requests.setDetailValues}
        onDetailSearch={requests.applyDetail}
        detailLoading={requests.loading}
      />
      {requests.loaded && !requests.loading && <SearchResultMessage resultCount={requests.rows.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ ...LABEL_CARD_SX, gap: 1 }}>
          <Typography variant="body2" color="text.secondary">확정 전이라 제품코드가 없는 건입니다. 여기서 미리 적어두고, 제품이 등록되면 옮기세요.</Typography>
          <LabelRequestGrid rows={requests.rows} columns={columns} loading={requests.loading} />
        </Card>
      </Box>
      <LabelFormDialog target={formTarget} onClose={() => setFormTarget(null)} onSaved={requests.reload} />
      <RequestMoveDialog target={moveTarget} onClose={() => setMoveTarget(null)} onPick={(p) => void doMove(p)} />
      {ask.node}
    </Box>
  );
}
