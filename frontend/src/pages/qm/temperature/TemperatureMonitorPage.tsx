import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, IconButton, Link, MenuItem, Snackbar, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { useAsk } from '../../../shared/components/AskDialog/useAsk';
import { BulkRegisterDialog, SensorEditDialog } from './components/TemperatureDialogs';
import {
  createGroup, deleteGroup, deleteSensor, fetchGroups, fetchReadings, fetchTempSettings, moveSensor, renameGroup, setRefreshInterval,
} from './services/temperature.service';
import {
  REFRESH_OPTIONS, UNGROUPED, batteryText, groupSections, rangeText, refreshToast, valueText,
  type TempGroup, type TempReading, type TempSection,
} from './utils/temperature';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

type TemperatureMonitorPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

const DANGER = '#dc2626';
const TEAL = '#0f766e';

// 센서 카드 하나. 기준을 벗어나면 빨간 테두리·⚠, 못 읽으면 까닭을 적는다. 끌어다 다른 그룹에 놓을 수 있다
function TempCard({ row, onEdit, onDelete }: { row: TempReading; onEdit: () => void; onDelete: () => void }) {
  const warn = Boolean(row.ok && row.outOfRange);
  return (
    <Card
      draggable aria-label={`센서 ${row.name}`}
      onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(row.id)); event.currentTarget.style.opacity = '0.4'; }}
      onDragEnd={(event) => { event.currentTarget.style.opacity = '1'; }}
      sx={{
        p: 1.75, cursor: 'grab', boxShadow: 'none', borderRadius: 2,
        border: warn ? `2px solid ${DANGER}` : '1px solid', borderColor: warn ? DANGER : row.ok ? 'divider' : 'rgba(220,38,38,0.3)',
        bgcolor: warn ? 'rgba(220,38,38,0.08)' : 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{row.name}</Typography>
        {warn && <Box component="span" aria-label="기준 벗어남" sx={{ color: DANGER, fontWeight: 700 }}>⚠</Box>}
      </Box>
      {row.ok ? (
        <>
          <Typography sx={{ fontSize: 24, fontWeight: 800, fontFamily: 'ui-monospace, Consolas, monospace', color: warn ? DANGER : TEAL }}>{valueText(row)}</Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.75, whiteSpace: 'pre-line' }}>
            {[rangeText(row), batteryText(row)].filter(Boolean).join('\n')}
          </Typography>
        </>
      ) : (
        <Typography sx={{ fontSize: 11, color: DANGER }}>{row.error || '조회 실패'}</Typography>
      )}
      <Box sx={{ mt: 1, display: 'flex', gap: 0.75 }}>
        {row.ok && <Button size="small" variant="outlined" onClick={onEdit} sx={{ minWidth: 0, px: 1, py: 0, fontSize: 11 }}>수정</Button>}
        {row.ok && <Button size="small" variant="outlined" color="error" onClick={onDelete} sx={{ minWidth: 0, px: 1, py: 0, fontSize: 11 }}>삭제</Button>}
      </Box>
    </Card>
  );
}

// 품질관리 > 실시간 온도 (송연 #screen-temp-monitor · 13-delivery-statement.js 209~ · 14-temperature.js 4~94)
// 라디오노드(타파쿨로365) 온도센서 값을 가져와 그룹별 카드로 보여준다. 그룹마다 자동 새로고침 주기를 따로 둔다.
// 센서가 실제로 값을 보내는 주기(측정·전송주기)는 타파쿨로365 장치 설정에서 바꿔야 한다.
export function TemperatureMonitorPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: TemperatureMonitorPageProps) {
  const navigate = useNavigate();
  const [configured, setConfigured] = useState(true);
  const [groups, setGroups] = useState<TempGroup[]>([]);
  const [rows, setRows] = useState<TempReading[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});
  const ask = useAsk('실시간 온도');

  const loadReadings = useCallback(async (force = false) => {
    setLoading(true);
    try {
      setRows(await fetchReadings(force));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  // 그룹마다 각자의 주기로 타이머를 다시 건다(그룹 타이머가 돌면 전체를 새로 받아온다)
  const setTimer = useCallback((name: string, seconds: number) => {
    if (timers.current[name]) {
      window.clearInterval(timers.current[name]);
      delete timers.current[name];
    }
    if (seconds > 0) timers.current[name] = window.setInterval(() => void loadReadings(true), seconds * 1000);
  }, [loadReadings]);

  const loadGroups = useCallback(async () => {
    const list = await fetchGroups().catch(() => [] as TempGroup[]);
    setGroups(list);
    Object.values(timers.current).forEach((id) => window.clearInterval(id));
    timers.current = {};
    list.forEach((g) => setTimer(g.name, g.refreshIntervalSec || 0));
  }, [setTimer]);

  useEffect(() => {
    fetchTempSettings().then((s) => setConfigured(s.configured)).catch(() => undefined);
    void loadGroups().then(() => loadReadings());
    const current = timers.current;
    return () => Object.values(current).forEach((id) => window.clearInterval(id));
  }, [loadGroups, loadReadings]);

  const sections: TempSection[] = groupSections(rows, groups.map((g) => g.name));
  const intervalOf = (name: string) => groups.find((g) => g.name === name)?.refreshIntervalSec ?? 0;

  const addGroup = async () => {
    const name = newGroup.trim();
    if (!name) {
      await ask.alert('그룹명을 입력해주세요');
      return;
    }
    try {
      await createGroup(name);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '그룹을 만들지 못했어요'));
      return;
    }
    setNewGroup('');
    await loadGroups();
    void loadReadings();
  };

  const changeInterval = async (name: string, seconds: number) => {
    try {
      await setRefreshInterval(name, seconds);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '바꾸지 못했어요'));
      return;
    }
    setGroups((cur) => cur.map((g) => (g.name === name ? { ...g, refreshIntervalSec: seconds } : g)));
    setTimer(name, seconds);
    setToast(refreshToast(name, seconds));
  };

  const doRename = async (oldName: string) => {
    const newName = await ask.prompt('새 그룹명을 입력해주세요', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
      await renameGroup(oldName, newName.trim());
    } catch (requestError) {
      await ask.alert(errorText(requestError, '수정에 실패했어요'));
      return;
    }
    await loadGroups();
    void loadReadings();
  };

  const doDeleteGroup = async (name: string) => {
    if (!(await ask.confirm(`"${name}" 그룹을 삭제할까요? (그룹 안의 센서는 삭제되지 않고 미분류로 이동해요)`, true))) return;
    await deleteGroup(name).catch(() => undefined);
    await loadGroups();
    void loadReadings();
  };

  const doDeleteSensor = async (id: number) => {
    if (!(await ask.confirm('이 센서를 목록에서 삭제할까요?', true))) return;
    await deleteSensor(id).catch(() => undefined);
    void loadReadings();
  };

  const dropOn = async (groupKey: string, sensorId: string) => {
    setDropTarget(null);
    if (!sensorId) return;
    try {
      await moveSensor(Number(sensorId), groupKey === UNGROUPED ? '' : groupKey);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '옮기지 못했어요'));
    }
    void loadReadings();
  };

  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    { key: 'read', actions: [{ label: '새로고침', icon: RefreshIcon, visible: Boolean(selectedMenuPermissions?.read), disabled: loading, onClick: () => void loadReadings(true) }] },
    { key: 'write', actions: [{ label: '센서 등록', icon: AddIcon, visible: canWrite, onClick: () => setBulkOpen(true) }] },
  ];

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <Box sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!configured && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            아직 타파쿨로365 연동 설정이 안 되어있어요.{' '}
            <Link component="button" onClick={() => navigate('/co/master/settings')} sx={{ fontWeight: 700, verticalAlign: 'baseline' }}>공통관리 &gt; 기준정보 &gt; 기초정보 &gt; 서버관리</Link>
            에서 API 키를 등록해주세요.
          </Alert>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <TextField
            size="small" margin="none" placeholder="새 그룹명 (예: 1가공실)" value={newGroup} onChange={(event) => setNewGroup(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addGroup(); } }}
            slotProps={{ htmlInput: { 'aria-label': '새 그룹명' } }} sx={{ width: 220 }}
          />
          <Button variant="outlined" onClick={() => void addGroup()}>+ 그룹 추가</Button>
        </Box>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
          💡 센서 카드를 드래그해서 원하는 그룹으로 옮길 수 있어요 · 그룹마다 자동 새로고침 주기를 각각 다르게 설정할 수 있어요(그룹 제목 옆 드롭다운) ·
          센서가 실제로 값을 보내는 주기(측정·전송주기)는 타파쿨로365 장치 설정에서 바꿔야 해요.
        </Typography>
        {loaded && rows.length === 0 && groups.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>등록된 센서가 없어요. &quot;센서 등록&quot;으로 추가해주세요.</Typography>
        )}
        {(loaded && rows.length === 0 && groups.length === 0 ? [] : sections).map((section) => {
          const ungrouped = section.key === UNGROUPED;
          return (
            <Box key={section.key} component="section" aria-label={`그룹 ${section.label}`} sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5, mb: 1, borderBottom: 2, borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {section.label} <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', fontSize: 11 }}>({section.rows.length})</Box>
                </Typography>
                {!ungrouped && (
                  <>
                    <TextField
                      select size="small" margin="none" value={intervalOf(section.key)}
                      onChange={(event) => void changeInterval(section.key, Number(event.target.value))}
                      slotProps={{ htmlInput: { 'aria-label': `${section.label} 자동새로고침` } }}
                      sx={{ ml: 1, width: 160, flex: '0 0 auto', '& .MuiInputBase-root': { height: 30, fontSize: 12 } }}
                    >
                      {REFRESH_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </TextField>
                    <IconButton size="small" title="그룹명 수정" aria-label={`${section.label} 그룹명 수정`} onClick={() => void doRename(section.key)}>✏️</IconButton>
                    <IconButton size="small" title="그룹 삭제" aria-label={`${section.label} 그룹 삭제`} onClick={() => void doDeleteGroup(section.key)} sx={{ color: DANGER }}>🗑️</IconButton>
                  </>
                )}
              </Box>
              <Box
                aria-label={`${section.label} 놓는 자리`}
                onDragOver={(event) => { event.preventDefault(); setDropTarget(section.key); }}
                onDragLeave={() => setDropTarget((cur) => (cur === section.key ? null : cur))}
                onDrop={(event) => { event.preventDefault(); void dropOn(section.key, event.dataTransfer.getData('text/plain')); }}
                sx={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1.5, minHeight: 60, p: 1, borderRadius: 2,
                  border: '2px dashed', borderColor: dropTarget === section.key ? TEAL : 'transparent', bgcolor: dropTarget === section.key ? 'rgba(15,118,110,0.08)' : 'transparent',
                }}
              >
                {section.rows.length === 0 ? (
                  <Typography sx={{ gridColumn: '1 / -1', p: 1.25, fontSize: 11.5, color: 'text.secondary' }}>여기로 센서 카드를 드래그해서 넣어주세요</Typography>
                ) : section.rows.map((r) => (
                  <TempCard key={r.id} row={r} onEdit={() => setEditing(r.id)} onDelete={() => void doDeleteSensor(r.id)} />
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
      <SensorEditDialog sensorId={editing} onClose={() => setEditing(null)} onSaved={() => void loadReadings()} />
      <BulkRegisterDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onSaved={() => void loadReadings()} />
      <Snackbar open={toast != null} autoHideDuration={2500} onClose={() => setToast(null)} message={toast ?? ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
      {ask.node}
    </Box>
  );
}
