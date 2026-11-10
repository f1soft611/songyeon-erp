import { useMemo } from 'react';
import { Alert, Box, Button, Card, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalculateIcon from '@mui/icons-material/Calculate';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ProdCheckLineGrid, createProdCheckLineColumns } from './components/ProdCheckLineGrid';
import { ProdCheckPickDialog } from './components/ProdCheckPickDialog';
import { ProdCheckResultGrid, createProdCheckResultColumns } from './components/ProdCheckResultGrid';
import { useProdCheck } from './hooks/useProdCheck';
import { conditionText, footerOf, qtyText } from './utils/prodCheck';

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', p: 1.5 };
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});

type ProdCheckPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function ProdCheckPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ProdCheckPageProps) {
  const check = useProdCheck();
  const { data, perCount, oneResult, shownRows } = check;

  const lineColumns = useMemo(() => createProdCheckLineColumns({
    data,
    canDetail: check.canDetail,
    onDetail: check.setOne,
    onRemove: check.removeLine,
  }),
    // 판정 표시는 확인 결과(data)가 바뀔 때 다시 그린다(빼기는 누를 때 표의 값을 다시 읽는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, check.canDetail]);
  const resultColumns = useMemo(() => createProdCheckResultColumns(data, perCount), [data, perCount]);
  const footer = footerOf(shownRows, perCount);
  const canRead = Boolean(selectedMenuPermissions?.read);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '엑셀 다운로드',
          icon: FileDownloadIcon,
          visible: Boolean(selectedMenuPermissions?.excel || selectedMenuPermissions?.read),
          onClick: () => void check.exportExcel(),
        },
        {
          label: '제품 추가',
          icon: AddIcon,
          visible: canRead,
          onClick: () => void check.openPicker()
        },
        {
          label: '확인',
          icon: CalculateIcon,
          visible: canRead,
          disabled: check.checking,
          onClick: () => void check.run()
        },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea
        searchField={
          <TextField
            type="date"
            size="small"
            margin="none"
            value={check.date}
            onChange={(event) => check.setDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '생산일자' } }}
            sx={(theme) => ({ width: { xs: '100%', sm: 200 }, ...searchFieldSx(theme) })}
          />
        }
        onDefaultSearch={() => void check.run()}
      />
      <PageMessageArea message={check.error} onClose={() => check.setError('')} />
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="body2" aria-live="polite" sx={{ px: 0.5, color: 'text.secondary' }}>{conditionText(data, check.lines.length)}</Typography>

        <Card sx={cardSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>만들 것</Typography>
          {check.lines.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>제품 추가 를 눌러 만들 제품을 골라주세요</Typography>
          )}
          <ProdCheckLineGrid lines={check.lines} columns={lineColumns} gridKey={check.linesVersion} gridRef={check.linesGridRef} />
        </Card>

        {check.verdict && <Alert severity={check.verdict.tone} variant="outlined" role="status" sx={{ borderRadius: 1, fontWeight: 700 }}>{check.verdict.text}</Alert>}

        {data && (
          <Card sx={cardSx}>
            {oneResult ? (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => check.setOne(null)}>‹ 합계로</Button>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{oneResult.product} — {qtyText(oneResult.qty)}kg 만 만들 때</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  재고는 다른 제품이 쓸 몫을 빼지 않은 값이에요. 다 함께 돌릴 수 있는지는 <b>합계</b>에서 봐주세요.
                </Typography>
              </Box>
            ) : (
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                원재료{data.lines.length > 1 ? ` — 제품 ${data.lines.length}개를 다 만들 때` : ''}
              </Typography>
            )}
            {shownRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">셀 원재료가 없습니다</Typography>
            ) : (
              <>
                <ProdCheckResultGrid
                  rows={shownRows}
                  columns={resultColumns}
                  gridKey={`${data.date}-${check.one ?? 'total'}-${perCount}`}
                  perCount={perCount}
                />
                {/* 송연 표 맨 아래 합계줄: 필요량만 더한다(재고는 서로 다른 원재료라 더하지 않는다) */}
                <Typography variant="body2" sx={{ mt: 1, textAlign: 'right', color: 'text.secondary' }}>
                  합계 (원재료 {footer.count}가지)
                  {footer.per.map((value, i) => <span key={i}> · 필요량{i + 1} <b>{qtyText(value)}</b></span>)}
                  {' · '}{perCount ? '필요량 합계' : '필요량'} <b>{qtyText(footer.need)}</b>
                  {' · '}
                  {footer.shortage > 0
                    ? <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>모두 {qtyText(footer.shortage)}kg 부족</Box>
                    : <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>모자란 것 없음</Box>}
                </Typography>
              </>
            )}
          </Card>
        )}
      </Box>
      {check.pickerOpen && (
        <ProdCheckPickDialog
          products={check.products}
          onPick={check.pickProducts}
          onClose={check.closePicker}
        />
      )}
    </Box>
  );
}
