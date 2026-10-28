import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import {
  getLabelBom, getLabelBomAllergens, getLabelCompanyInfo, getLabelTemplate, getLabelVersion,
  listLabelMarks, listLabelTemplates, listLabelVersions,
} from './label.service';
import { LabelBomPanel, type LabelBomState } from './LabelBomPanel';
import type {
  LabelBomAllergens, LabelCompanyInfo, LabelFormat, LabelInfo, LabelMark, LabelTemplate, LabelVersion,
} from './label.types';
import {
  buildLabelHTML, buildLabelPrintDocument, LABEL_CSS, LABEL_STD_FIELDS, labelPrintDateKr, missingLabelItems, sanitizeLabelHtml, type LabelSheet,
} from './labelHtml';

// 라벨 창 — 인쇄 전용 (송연 shared/components/LabelForm, 기존 07-label.js openLabelForm printMode).
// 생산관리 > 라벨출력, 생산확정의 🏷️ 라벨에서 연다. 라벨등록(고치기)은 그 화면을 옮길 때 더한다.
//
// 인쇄로 열면 '사용중' 버전으로 고정하고 칸을 잠근다. 현장에서 버전이나 글자가 바뀌면
// 등록된 것과 다른 라벨이 붙어 나간다. 옛 버전을 다시 뽑을 때는 라벨등록에서 골라 인쇄한다.
// (송연과 같이 분리배출마크·라벨 양식·양식에만 있는 항목 칸은 잠그지 않았다)

const ZOOM_KEY = 'songyeon-label-preview-zoom';
const ZOOM_OPTIONS = [
  { value: '1', label: '100% (실제 크기)' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
  { value: '1.75', label: '175%' },
  { value: '2', label: '200%' },
];
const SIZE_OPTIONS = [
  { value: '100x150', label: '100mm × 150mm' },
  { value: '100x130', label: '100mm × 130mm' },
];

type Loaded = {
  company: LabelCompanyInfo;
  marks: LabelMark[];
  templates: LabelTemplate[];
  versions: LabelVersion[];
  currentId: number | null;
};
type AllergenNote = { kind: 'filled' | 'differ' | 'applied'; data: LabelBomAllergens } | null;

function readZoom() {
  try {
    return localStorage.getItem(ZOOM_KEY) || '1.25';
  } catch {
    return '1.25';
  }
}

const today = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const lockedField = { size: 'small' as const, margin: 'none' as const, fullWidth: true, slotProps: { input: { readOnly: true } } };
const metaSx = { color: 'text.secondary', fontSize: 12.5 };
const softBox = { border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' };

export type LabelPrintTarget = { code: string; name: string; mfgDate: string };

// mfgDate: 제조년월일로 찍을 생산확정 날짜. 비어 오면 오늘 날짜로 미리 보여준다(송연과 같음).
export function LabelPrintDialog({ target, onClose }: { target: LabelPrintTarget | null; onClose: () => void }) {
  return target ? <LabelPrintDialogBody key={`${target.code}|${target.mfgDate}`} target={target} onClose={onClose} /> : null;
}

function LabelPrintDialogBody({ target, onClose }: { target: LabelPrintTarget; onClose: () => void }) {
  const { code, name } = target;
  const mfgDate = target.mfgDate || today();
  const formatCache = useRef<Record<string, LabelFormat | null>>({});
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [info, setInfo] = useState<LabelInfo>({});
  const [sizeSelect, setSizeSelect] = useState('100x150'); // 잠긴 '라벨 크기' 칸의 값
  const [formatId, setFormatId] = useState('');
  const [format, setFormat] = useState<LabelFormat | null>(null);
  const [markId, setMarkId] = useState('');
  const [markWidth, setMarkWidth] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState(readZoom);
  const [bom, setBom] = useState<LabelBomState>({ kind: 'loading' });
  const [allergenNote, setAllergenNote] = useState<AllergenNote>(null);
  const [printError, setPrintError] = useState('');

  const loadFormat = async (id: string) => {
    if (!(id in formatCache.current)) {
      formatCache.current[id] = await getLabelTemplate(id).then((t) => t.layout || null).catch(() => null);
    }
    return formatCache.current[id];
  };

  // 송연 openLabelForm(printMode): 회사정보 → 마크 → 양식 목록 → 버전 목록 → 사용중 버전을 채운 뒤 창을 연다.
  // 배합표와 알러지 제안은 늦게 와도 되니 창을 연 뒤에 채운다.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const company = await getLabelCompanyInfo().catch(() => ({} as LabelCompanyInfo));
      const marks = await listLabelMarks().catch(() => [] as LabelMark[]);
      const templates = await listLabelTemplates().catch(() => [] as LabelTemplate[]);
      const list = await listLabelVersions(code).catch(() => ({ versions: [] as LabelVersion[], currentId: null }));
      const currentId = list.currentId || null;
      let allergens = '';
      if (currentId) {
        const version = await getLabelVersion(currentId).catch(() => ({} as LabelInfo));
        const layout = version.layout || {};
        const nextSize = layout.size || '100x150';
        const fmtId = layout.format_id ? String(layout.format_id) : '';
        const chosen = templates.some((t) => String(t.id) === fmtId) ? fmtId : '';
        const nextFormat = chosen ? await loadFormat(chosen) : null;
        const recycle = layout.recycle || {};
        const mark = marks.find((m) => String(m.id) === String(recycle.mark_id));
        if (!alive) return;
        setInfo(version);
        setSizeSelect(nextSize);
        setFormatId(chosen);
        setFormat(nextFormat);
        setMarkId(recycle.mark_id && mark ? String(recycle.mark_id) : '');
        setMarkWidth(String(recycle.width_mm || (mark ? mark.widthMm : '') || ''));
        setExtra(version.extra || {});
        allergens = (version.allergens || '').trim();
      }
      if (!alive) return;
      setLoaded({ company, marks, templates, versions: list.versions || [], currentId });

      getLabelBom(code)
        .then((rows) => alive && setBom({ kind: 'rows', rows }))
        .catch(() => alive && setBom({ kind: 'error' }));
      // 원재료에 적어둔 알러지유발물질. 비어 있으면 채우고, 이미 적어둔 것이 다르면 알리기만 한다
      // (사람이 다듬어둔 문구를 말없이 지우면 안 된다).
      getLabelBomAllergens(code).then((data) => {
        if (!alive || !currentId || !data || !data.text) return;
        if (!allergens) {
          setInfo((previous) => ({ ...previous, allergens: data.text }));
          setAllergenNote({ kind: 'filled', data });
        } else if (allergens !== data.text) {
          setAllergenNote({ kind: 'differ', data });
        }
      }).catch(() => undefined);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const hasVersion = Boolean(loaded?.currentId);
  const marks = loaded?.marks ?? [];
  const company = loaded?.company ?? {};
  // 양식을 고르면 그 양식의 종이 크기, 기본 양식이면 버전에 적힌 크기
  const size = format?.paper ? `${format.paper.w}x${format.paper.h}` : sizeSelect;
  const recycle = markId ? { mark_id: parseInt(markId, 10), width_mm: parseFloat(markWidth) || undefined } : null;
  const sheet: LabelSheet = {
    code,
    name,
    mfgDate,
    // 양식에만 있는 항목은 앞뒤 공백을 떼고 넣는다(송연 readLabelForm)
    info: { ...info, extra: Object.fromEntries(Object.entries({ ...(info.extra || {}), ...extra }).map(([k, v]) => [k, String(v ?? '').trim()])) },
    companyInfo: company,
    format,
    recycle,
    marks,
  };

  // 고른 양식에만 있는 항목(예: 유통전문판매원)의 입력칸
  const extraFields = useMemo(() => {
    const used: string[] = [];
    format?.rows?.forEach((row) => (row.cells || []).forEach((cell) => {
      if (cell.type === 'field' && cell.field && !(cell.field in LABEL_STD_FIELDS) && !used.includes(cell.field)) used.push(cell.field);
    }));
    return used;
  }, [format]);

  const chooseFormat = async (id: string) => {
    setFormatId(id);
    setFormat(id ? await loadFormat(id) : null);
  };

  const print = () => {
    const win = window.open('', '_blank');
    if (!win) {
      setPrintError('새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.');
      return;
    }
    win.document.write(buildLabelPrintDocument(sheet, size));
    win.document.close();
  };

  if (!loaded) return null;

  const [pw, ph] = (size || '100x150').split('x');
  const zoomValue = Number.isNaN(parseFloat(zoom)) ? 1 : parseFloat(zoom);
  const missing = hasVersion ? missingLabelItems(info, company) : [];
  const sourceText = allergenNote ? allergenNote.data.sources.map((s) => `${s.materialName}(${s.allergens.join('·')})`).join(', ') : '';
  const currentVersion = loaded.versions.find((v) => v.id === loaded.currentId);

  return (
    <Dialog open onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(1480px, 96vw)', maxHeight: '92vh' } } }} aria-labelledby="label-print-title">
      <DialogTitle id="label-print-title" sx={{ fontSize: 16, fontWeight: 700 }}>라벨 인쇄 — {name}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ ...softBox, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', px: 1.25, py: 1, mb: 1.5 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>버전</Typography>
          {hasVersion && currentVersion && (
            <TextField
              select size="small" margin="none" disabled value={String(currentVersion.id)}
              fullWidth={false} slotProps={{ htmlInput: { 'aria-label': '라벨 버전' } }} sx={{ width: 320, maxWidth: '100%' }}
            >
              <MenuItem value={String(currentVersion.id)}>
                {currentVersion.versionLabel}{currentVersion.isCurrent ? ' — 사용중' : ''} ({(currentVersion.createdAt || '').slice(0, 10)}
                {currentVersion.createdBy ? ` ${currentVersion.createdBy}` : ''})
              </MenuItem>
            </TextField>
          )}
          <Typography sx={{ ...metaSx, fontSize: 11.5 }}>
            {hasVersion ? '이 제품에 지금 붙는 라벨입니다' : '아직 버전이 없습니다. 품질관리 > 라벨등록에서 칸을 채우고 저장하면 v1 이 만들어집니다.'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.25, alignItems: 'flex-start' }}>
          {/* 맨 왼쪽: 이 제품의 배합표. 라벨의 '원재료명 및 함량' 을 이걸 보고 적는다(보기 전용) */}
          <LabelBomPanel bom={bom} title="이 제품의 원재료 (제품BOM)" />

          {/* 가운데: 칸(인쇄로 열면 잠김) */}
          <Box sx={{ flex: 1, minWidth: { xs: 0, sm: 330 }, maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Typography sx={metaSx}>인쇄 전용으로 열었습니다. 라벨 내용은 품질관리 &gt; 라벨등록에서 고칩니다. 회사 정보와 주의사항은 모든 라벨에 공통으로 들어갑니다.</Typography>
            <TextField {...lockedField} label="제품명" value={name} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              <TextField {...lockedField} label="식품유형" value={info.foodType || ''} />
              <TextField {...lockedField} label="내용량" value={info.netWeight || ''} />
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>제조년월일</Typography>
                <Box sx={{ ...softBox, px: 1.25, py: 1, fontSize: 13 }} aria-label="제조년월일">
                  {hasVersion && (
                    <>
                      {labelPrintDateKr(mfgDate)}{' '}
                      <Typography component="span" sx={{ ...metaSx, fontSize: 11.5 }}>
                        {target.mfgDate ? '— 생산확정 날짜' : '— 미리보기용(오늘). 인쇄할 때 생산확정 날짜가 들어갑니다'}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <TextField {...lockedField} label="소비기한(제조일로부터)" value={info.shelfLifeMonths ?? ''} />
                <TextField {...lockedField} label="단위" value={info.shelfLifeMonths ? (info.shelfLifeUnit || '월') : ''} sx={{ width: 70, flex: '0 0 70px' }} />
              </Box>
              <TextField {...lockedField} label="보관방법" value={info.storage || ''} />
              <TextField {...lockedField} label="포장재질(내면)" value={info.packagingMaterial || ''} sx={{ gridColumn: '1 / -1' }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>원재료명 및 함량</Typography>
              <Box
                aria-label="원재료명 및 함량"
                sx={{ ...softBox, minHeight: 110, px: 1.25, py: 1, fontSize: 12.5, lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: info.ingredientsText ? sanitizeLabelHtml(info.ingredientsText) : '' }}
              />
            </Box>
            {extraFields.map((field) => (
              <TextField
                key={field} size="small" margin="none" fullWidth label={field}
                value={extra[field] ?? (info.extra || {})[field] ?? ''}
                onChange={(event) => setExtra((previous) => ({ ...previous, [field]: event.target.value }))}
              />
            ))}
            <Box>
              <TextField {...lockedField} label="알러지유발원재료" value={info.allergens || ''} />
              {allergenNote && (
                <Alert severity="warning" icon={false} sx={{ mt: 0.75, py: 0, fontSize: 11.5, lineHeight: 1.6 }}>
                  {allergenNote.kind === 'filled' && <>배합표의 원재료에서 자동으로 채웠습니다 — <b>{sourceText}</b></>}
                  {allergenNote.kind === 'applied' && <>배합표 기준으로 바꿨습니다 — <b>{sourceText}</b></>}
                  {allergenNote.kind === 'differ' && (
                    <>
                      배합표 기준으로는 <b>{allergenNote.data.text}</b> 입니다 ({sourceText}). 적어둔 내용과 다릅니다.
                      <Button
                        size="small" sx={{ ml: 0.5, minWidth: 0, py: 0, fontSize: 11 }}
                        onClick={() => {
                          setInfo((previous) => ({ ...previous, allergens: allergenNote.data.text }));
                          setAllergenNote({ kind: 'applied', data: allergenNote.data });
                        }}
                      >
                        배합표 기준으로 바꾸기
                      </Button>
                    </>
                  )}
                </Alert>
              )}
            </Box>
            <TextField {...lockedField} label="품목제조보고번호" value={info.manufactureReportNo || ''} />
            <Box>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                <TextField
                  select size="small" margin="none" label="분리배출마크" value={markId} sx={{ flex: 1, minWidth: 150 }}
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  onChange={(event) => {
                    const mark = marks.find((m) => String(m.id) === event.target.value);
                    setMarkId(event.target.value);
                    setMarkWidth(mark ? String(mark.widthMm || 9) : '');
                  }}
                >
                  <MenuItem value="">없음</MenuItem>
                  {marks.map((m) => <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>)}
                </TextField>
                <TextField
                  type="number" size="small" margin="none" label="가로(mm)" value={markWidth} sx={{ width: 100 }}
                  slotProps={{ htmlInput: { min: 1, max: 100, step: 0.5, 'aria-label': '분리배출마크 가로 크기' } }}
                  onChange={(event) => setMarkWidth(event.target.value)}
                />
              </Box>
              <Typography sx={{ ...metaSx, fontSize: 11.5, mt: 0.5 }}>마크는 품질관리 &gt; 라벨양식 &gt; ‘마크 등록’ 에서 넣습니다</Typography>
            </Box>
            <TextField
              select size="small" margin="none" label="라벨 양식" value={formatId}
              slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
              onChange={(event) => void chooseFormat(event.target.value)}>
              <MenuItem value="">기본 양식</MenuItem>
              {loaded.templates.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}{t.size ? ` (${t.size})` : ''}</MenuItem>)}
            </TextField>
            {!formatId && (
              <TextField select size="small" margin="none" label="라벨 크기" disabled value={SIZE_OPTIONS.some((o) => o.value === sizeSelect) ? sizeSelect : ''}>
                {SIZE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            )}
            <Typography sx={{ ...metaSx, fontSize: 11.5, lineHeight: 1.6 }}>
              인쇄물 위아래에 <b>날짜·시간·주소</b>가 같이 찍힌다면, 인쇄 창에서 <b>여백을 '없음'</b>으로 하고
              <b> '머리글 및 바닥글' 체크를 해제</b>해주세요. 한 번만 해두면 그 PC에서는 계속 기억합니다.
            </Typography>
            {missing.length > 0 && <Alert severity="warning" sx={{ fontSize: 11.5 }}>아직 비어 있는 항목: {missing.join(', ')}</Alert>}
            {printError && <Alert severity="error" onClose={() => setPrintError('')}>{printError}</Alert>}
          </Box>

          {/* 오른쪽: 실제 인쇄될 모양 그대로. 배율은 화면에서만, 인쇄는 늘 실제 크기 */}
          <Box sx={{ flex: 1, minWidth: { xs: 0, sm: `calc(${pw}mm * ${zoomValue} + 22px)` }, maxWidth: '100%' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
              <Typography sx={metaSx}>미리보기</Typography>
              <TextField
                select size="small" margin="none" value={zoom}
                slotProps={{ htmlInput: { 'aria-label': '미리보기 배율' } }} sx={{ width: 160 }}
                onChange={(event) => {
                  setZoom(event.target.value);
                  try {
                    localStorage.setItem(ZOOM_KEY, event.target.value);
                  } catch {
                    // 저장 못 해도 이번 창에서는 쓴다
                  }
                }}
              >
                {ZOOM_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
              <Typography sx={{ ...metaSx, fontSize: 11.5 }}>인쇄는 배율과 상관없이 실제 크기로 나갑니다</Typography>
            </Box>
            {hasVersion ? (
              <Box
                aria-label="라벨 미리보기"
                sx={{ ...softBox, maxHeight: '64vh', overflow: 'auto', p: 1.25 }}
                dangerouslySetInnerHTML={{
                  __html: `<style>${LABEL_CSS}</style>
                    <div style="width:calc(${pw}mm * ${zoomValue});height:calc(${ph}mm * ${zoomValue});">
                      <div style="width:${pw}mm;height:${ph}mm;outline:1px dashed #B9C0CC;background:#fff;transform:scale(${zoomValue});transform-origin:top left;">
                        ${buildLabelHTML(sheet)}
                      </div>
                    </div>
                    <div style="width:calc(${pw}mm * ${zoomValue});margin-top:4px;color:#64748b;font-size:10.5px;text-align:center;">
                      점선 = 라벨지 ${pw}×${ph}mm (인쇄되지 않습니다)${zoomValue !== 1 ? ` · 화면에서만 ${Math.round(zoomValue * 100)}% 확대` : ''}
                    </div>`,
                }}
              />
            ) : (
              <Box aria-label="라벨 미리보기" sx={{ ...softBox, p: 1.25 }}>
                <Typography sx={{ ...metaSx, py: 3, textAlign: 'center', lineHeight: 1.7 }}>
                  아직 라벨이 등록되지 않았어요.<br />품질관리 &gt; 라벨등록 에서 만들 수 있어요.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
        <Button variant="contained" startIcon={<PrintIcon />} disabled={!hasVersion} onClick={print}>인쇄</Button>
      </DialogActions>
    </Dialog>
  );
}

