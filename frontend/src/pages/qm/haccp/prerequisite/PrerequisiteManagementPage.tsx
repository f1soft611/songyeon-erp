import { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, IconButton, InputAdornment, MenuItem, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { clientPickerOptions } from '../../../co/master/item-master/utils/itemMaster';
import { NewSurveyFormDialog } from './components/NewSurveyFormDialog';
import { SurveyFormEditor } from './components/SurveyFormEditor';
import { SurveyRecordGrid, createSurveyRecordColumns } from './components/SurveyRecordGrid';
import { SurveySheet } from './components/SurveySheet';
import { useSurveyCheck } from './hooks/useSurveyCheck';
import { useSurveyForms } from './hooks/useSurveyForms';
import { useSurveyRecords } from './hooks/useSurveyRecords';
import { PREREQUISITE_TABS, formCardMeta, missingTitle, type PrerequisiteTab } from './utils/prerequisite';

type PrerequisiteManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const cardSx = { borderRadius: 1, border: '1px solid rgba(148,163,184,0.18)', boxShadow: 'none', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 1.5 };
const searchFieldSx = (theme: { palette: { mode: string } }) => ({
  width: '100%',
  height: 40,
  '& .MuiOutlinedInput-root': {
    height: '100%',
    borderRadius: '0 8px 8px 0',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const sideFieldSx = (theme: { palette: { mode: string } }) => ({
  '& .MuiOutlinedInput-root': {
    height: 40,
    borderRadius: '8px',
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.72)' : 'rgba(255,255,255,0.72)',
  },
});
const emptyText = { p: 3, textAlign: 'center', fontSize: 12.5, color: 'text.secondary' } as const;

// 품질관리 > HACCP > HACCP(선행) (화면ID HCPrerequisiteView, 송연 #screen-qdoc-survey · 43-qdoc-survey.js)
// 정해진 질문에 골라 답하는 선행요건 점검표. 양식(질문과 고를 답)은 '양식 만들기' 탭에서 등록하고, 점검 나간 사람은 그것을 보고 체크한다.
// 2026-11-06 화면만 옮겼고(20261106_004), 2026-11-09 점검 · 현황 탭(20261109_001) · 양식 만들기(20261109_002)를 서버에 붙였다. 결재는 방식이 정해지면
export function PrerequisiteManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: PrerequisiteManagementPageProps) {
  const [tab, setTab] = useState<PrerequisiteTab>('check');
  const check = useSurveyCheck();
  const records = useSurveyRecords(tab === 'list');
  const builder = useSurveyForms(tab === 'build', () => void check.reloadForms());
  // 양식 만들기는 등록 · 수정 권한이 있을 때만(원본은 양식 권한 qdoc-form 이 따로다 — 없는 사람에게는 탭이 아예 안 보인다)
  const canBuild = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const tabs = PREREQUISITE_TABS.filter((item) => item.value !== 'build' || canBuild);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [newFormOpen, setNewFormOpen] = useState(false);

  const recordColumns = useMemo(() => createSurveyRecordColumns({ onOpen: (row) => void records.openRecord(row.id) }), [records.openRecord]);
  const searchClients = async (keyword: string): Promise<MasterPickerOption[]> => clientPickerOptions(check.clients, keyword);

  const canRead = Boolean(selectedMenuPermissions?.read);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        { label: '점검표 열기', icon: FactCheckIcon, visible: canRead && tab === 'check', disabled: check.opening, onClick: () => void check.open() },
        { label: '조회', icon: SearchIcon, visible: canRead && tab === 'list', disabled: records.loading, onClick: records.search },
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
      <Box sx={{ px: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_event, value: PrerequisiteTab) => setTab(value)} aria-label="HACCP(선행) 탭" variant="scrollable" allowScrollButtonsMobile>
          {tabs.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}
        </Tabs>
      </Box>

      {tab === 'check' && (
        <PageSearchArea
          searchField={
            <TextField select size="small" margin="none" value={check.formId} onChange={(event) => check.setFormId(event.target.value)}
              slotProps={{ select: { displayEmpty: true, SelectDisplayProps: { 'aria-label': '서류' } as object } }} sx={searchFieldSx}>
              {check.forms.length === 0
                ? <MenuItem value="">쓸 수 있는 서류가 없습니다</MenuItem>
                : check.forms.map((form) => <MenuItem key={form.id} value={String(form.id)}>{`${form.name} (질문 ${form.questions}개)`}</MenuItem>)}
            </TextField>
          }
          onDefaultSearch={() => void check.open()}
        >
          {/* 업체마다 쓰는 서류일 때만. 날짜마다 쓰는 점검일지에 거래처 칸이 붙어 있으면 무엇을 골라야 하나 망설인다. 거래처 고르기 창(거래처코드) */}
          {check.needsClient && (
            <TextField size="small" margin="none" placeholder="점검한 거래처"
              value={check.clientCode ? `${check.clientCode} · ${check.clientName}` : ''}
              slotProps={{
                htmlInput: { 'aria-label': '점검한 거래처', readOnly: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="점검한 거래처 선택">
                        <IconButton aria-label="점검한 거래처 선택" edge="end" size="small" sx={{ p: 0.75 }} onClick={() => setClientPickerOpen(true)}>
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
              sx={(theme) => ({ width: 230, ...sideFieldSx(theme) })} />
          )}
          <TextField type="date" size="small" margin="none" value={check.docDate} onChange={(event) => check.setDocDate(event.target.value)}
            slotProps={{ htmlInput: { 'aria-label': '점검일', max: '9999-12-31' } }} sx={(theme) => ({ width: 160, ...sideFieldSx(theme) })} />
        </PageSearchArea>
      )}
      {tab === 'list' && (
        <PageSearchArea
          searchField={
            <TextField select size="small" margin="none" value={records.formId} onChange={(event) => records.setFormId(event.target.value)}
              slotProps={{ select: { displayEmpty: true, SelectDisplayProps: { 'aria-label': '서류' } as object } }} sx={searchFieldSx}>
              <MenuItem value="">서류 전체</MenuItem>
              {check.forms.map((form) => <MenuItem key={form.id} value={String(form.id)}>{form.name}</MenuItem>)}
            </TextField>
          }
          onDefaultSearch={records.search}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
            <TextField type="date" size="small" margin="none" value={records.start} onChange={(event) => records.setStart(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '시작일', max: '9999-12-31' } }} sx={(theme) => ({ width: 160, ...sideFieldSx(theme) })} />
            <Typography color="text.secondary">~</Typography>
            <TextField type="date" size="small" margin="none" value={records.end} onChange={(event) => records.setEnd(event.target.value)}
              slotProps={{ htmlInput: { 'aria-label': '종료일', max: '9999-12-31' } }} sx={(theme) => ({ width: 160, ...sideFieldSx(theme) })} />
          </Box>
        </PageSearchArea>
      )}

      {tab === 'list' && records.loaded && !records.loading && !records.error && <SearchResultMessage resultCount={records.rows.length} />}
      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Card sx={{ ...cardSx, overflow: 'auto' }}>
          {tab === 'check' && (
            <>
              {check.openMessage && <Alert severity="warning" sx={{ mb: 1, py: 0 }}>{check.openMessage}</Alert>}
              {check.formsLoaded && check.forms.length === 0 && <Typography variant="body2" color="text.secondary">양식 만들기 탭에서 서류를 먼저 등록해주세요</Typography>}
              {/* 고른 서류 · 날짜(· 거래처)의 점검표 한 장 */}
              {check.sheet && (
                <SurveySheet data={check.sheet} onSave={(answers) => void check.save(answers)} saving={check.saving} message={check.saveMessage} />
              )}
            </>
          )}
          {tab === 'list' && (
            <>
              {records.error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{records.error}</Alert>}
              {/* 안 쓴 기간(기간을 정해둔 서류만). 쓴 것만 보여주면 빠뜨린 줄은 감사에서 지적받을 때 처음 알게 된다 */}
              {records.missing.map((gap) => (
                <Box key={gap.formId} sx={{ mb: 1, p: 1, border: 1, borderColor: 'warning.light', borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'baseline', fontSize: 13 }}>
                    <b>{gap.formName}</b>
                    <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>{missingTitle(gap)}</Box>
                    <Box component="span" sx={{ ml: 'auto', color: 'warning.dark', fontWeight: 700 }}>{`${gap.rows.length}건`}</Box>
                  </Box>
                  <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {gap.rows.map((row) => (
                      <Box key={`${row.label}-${row.period}`} component="span" sx={{ px: 0.75, py: 0.25, borderRadius: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', fontSize: 12 }}>{row.label}</Box>
                    ))}
                  </Box>
                </Box>
              ))}
              <Box sx={{ height: 36 + Math.max(38 * Math.max(records.rows.length, 4), 120), minHeight: 160, maxHeight: 420, display: 'flex', flexDirection: 'column', flex: 'none' }}>
                <SurveyRecordGrid key="records" rows={records.rows} columns={recordColumns} loading={records.loading} />
              </Box>
              {/* 줄을 누르면 표 아래에 보기 전용으로 연다. 고치는 자리는 점검 탭 한 곳 */}
              {records.viewSheet && <Box sx={{ mt: 1.5 }}><SurveySheet data={records.viewSheet} view /></Box>}
            </>
          )}
          {tab === 'build' && (
            <>
              {builder.message && <Alert severity={builder.message.severity} sx={{ mb: 1, py: 0 }}>{builder.message.text}</Alert>}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.75, alignItems: 'flex-start' }}>
                {/* 왼쪽: 만들어 둔 서류(살아 있는 것 먼저, 내려둔 것은 흐리게) */}
                <Box sx={{ width: { xs: '100%', md: 290 }, flex: 'none', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Button variant="contained" fullWidth onClick={() => setNewFormOpen(true)}>+ 새 서류 만들기</Button>
                  {builder.loaded && builder.forms.length === 0 && <Typography sx={emptyText}>아직 만든 서류가 없습니다</Typography>}
                  {builder.forms.map((form) => {
                    const on = builder.form?.id === form.id;
                    return (
                      <Button key={form.id} variant="outlined" color={on ? 'primary' : 'inherit'} onClick={() => builder.select(form.id)}
                        sx={{ display: 'block', textAlign: 'left', textTransform: 'none', px: 1.25, py: 1, opacity: form.active ? 1 : 0.55, borderColor: on ? 'primary.main' : 'divider', bgcolor: on ? 'action.selected' : undefined }}>
                        <Typography component="span" sx={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{form.name}</Typography>
                        <Typography component="span" sx={{ display: 'block', fontSize: 11.5, color: 'text.secondary' }}>{formCardMeta(form)}</Typography>
                      </Button>
                    );
                  })}
                </Box>
                {/* 오른쪽: 고른 서류 고치기 */}
                <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                  {builder.form ? (
                    <SurveyFormEditor
                      form={builder.form}
                      busy={builder.busy}
                      onSaveInfo={(info) => void builder.saveInfo(info)}
                      onToggleActive={() => void builder.toggleActive()}
                      onSaveChoices={(choices, hasNote, hasDefect) => void builder.saveChoices(choices, hasNote, hasDefect)}
                      onSaveItem={builder.saveItem}
                      onDeleteItem={(item) => void builder.deleteItem(item)}
                      onMoveItem={(item, dir) => void builder.moveItem(item, dir)}
                    />
                  ) : (
                    <Typography sx={{ ...emptyText, py: 5 }}>왼쪽에서 서류를 고르거나, 새로 만들어주세요</Typography>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Card>
      </Box>

      <MasterPickerDialog
        label="점검한 거래처"
        open={clientPickerOpen}
        search={searchClients}
        onClose={() => setClientPickerOpen(false)}
        onChange={(option) => {
          check.setClientCode(option.code);
          setClientPickerOpen(false);
        }}
      />
      <NewSurveyFormDialog open={newFormOpen} forms={builder.forms} onClose={() => setNewFormOpen(false)} onCreate={builder.create} />
    </Box>
  );
}
