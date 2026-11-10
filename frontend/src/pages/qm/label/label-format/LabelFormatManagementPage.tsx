import { useMemo, useState } from 'react';
import { Box, Card, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import { useAsk } from '../../../../shared/components/AskDialog/useAsk';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { LabelFormatEditor, type FormatEditTarget } from '../label-register/components/LabelFormatEditor';
import { LabelFieldDialog, LabelMarkDialog } from '../label-register/components/LabelSideDialogs';
import { LABEL_CARD_SX, searchFieldSx } from '../label-register/components/labelGridParts';
import { deleteTemplate, fetchTemplateUsage } from '../label-register/services/labelRegister.service';
import { LabelFormatGrid, createLabelFormatColumns, type LabelFormatRow } from './components/LabelFormatGrid';
import { useLabelFormats } from './hooks/useLabelFormats';

type LabelFormatManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

// 품질관리 > 라벨관리 > 라벨양식 (화면ID LBLabelFormatView, 송연 26-label-format.js)
// 라벨 인쇄에 쓰는 양식과 양식에 넣을 항목 · 마크를 관리한다. 쓰는 제품이 있는 양식은 지우지 않는다.
// 2026-11-05 라벨등록 탭에서 화면으로 나눴다. 검색줄은 양식 이름(받은 목록 안에서 거름)
export function LabelFormatManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: LabelFormatManagementPageProps) {
  const ask = useAsk('라벨양식');
  const formats = useLabelFormats();
  const [editorTarget, setEditorTarget] = useState<FormatEditTarget | null>(null);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);

  const removeTemplate = async (t: LabelFormatRow) => {
    const use = await fetchTemplateUsage(t.id).catch(() => ({ count: 0, products: [] }));
    if (use.count) {
      await ask.alert(`이 양식을 쓰는 제품이 ${use.count}개 있어서 지울 수 없어요.\n먼저 그 제품들의 양식을 바꿔주세요.`);
      return;
    }
    if (!(await ask.confirm(`"${t.name}" 양식을 지울까요?\n되돌릴 수 없습니다.`, true))) return;
    try {
      await deleteTemplate(t.id);
    } catch {
      await ask.alert('지우지 못했어요');
      return;
    }
    formats.reload();
  };

  const columns = useMemo(() => createLabelFormatColumns({
    onEdit: (row) => setEditorTarget({ mode: 'edit', id: row.id }),
    onCopy: (row) => setEditorTarget({ mode: 'copy', id: row.id }),
    onDelete: (row) => void removeTemplate(row),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    { key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: formats.loading, onClick: formats.reload }] },
    {
      key: 'write',
      actions: [
        { label: '새 양식', icon: AddIcon, visible: canWrite, onClick: () => setEditorTarget({ mode: 'new' }) },
        { label: '항목 등록', icon: AddIcon, visible: canWrite, onClick: () => setFieldOpen(true) },
        { label: '마크 등록', icon: AddIcon, visible: canWrite, onClick: () => setMarkOpen(true) },
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
            placeholder="양식 이름 검색"
            value={formats.keyword}
            onChange={(event) => formats.setKeyword(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '양식 이름 검색' } }}
            sx={searchFieldSx}
          />
        }
        onDefaultSearch={formats.reload}
      />
      {formats.loaded && !formats.loading && <SearchResultMessage resultCount={formats.rows.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ ...LABEL_CARD_SX, gap: 1 }}>
          <Typography variant="body2" color="text.secondary">기본 양식을 복사해서 시작합니다. 모양이 많이 다르면 편집기 안에서 ‘초기화’ 를 누르면 빈 표가 됩니다.</Typography>
          <LabelFormatGrid rows={formats.rows} columns={columns} loading={formats.loading} />
        </Card>
      </Box>
      <LabelFormatEditor target={editorTarget} onClose={() => setEditorTarget(null)} onSaved={formats.reload} />
      <LabelFieldDialog open={fieldOpen} onClose={() => setFieldOpen(false)} onChanged={() => undefined} />
      <LabelMarkDialog open={markOpen} onClose={() => setMarkOpen(false)} />
      {ask.node}
    </Box>
  );
}
