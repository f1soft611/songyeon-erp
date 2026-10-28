import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useAsk } from '../../../../shared/components/AskDialog/useAsk';
import { LabelBomPanel, type LabelBomState } from '../../../../shared/components/LabelPrintDialog/LabelBomPanel';
import {
  getLabelBom, getLabelBomAllergens, getLabelCompanyInfo, getLabelTemplate, getLabelVersion, listLabelMarks, listLabelTemplates, listLabelVersions,
} from '../../../../shared/components/LabelPrintDialog/label.service';
import type {
  LabelBomAllergens, LabelCompanyInfo, LabelFormat, LabelInfo, LabelMark, LabelTemplate, LabelVersion,
} from '../../../../shared/components/LabelPrintDialog/label.types';
import {
  LABEL_CSS, LABEL_FORMAT_BASIC, LABEL_STD_FIELDS, buildLabelHTML, buildLabelPrintDocument, labelPrintDateKr, missingLabelItems, type LabelSheet,
} from '../../../../shared/components/LabelPrintDialog/labelHtml';
import {
  createVersion, deleteVersion, fetchRequest, renameVersion, saveLabel, saveLayout, saveRequest, setVersionInUse, type LabelRequestDetail,
} from '../services/labelRegister.service';
import { extraFieldsOf, nextVersionName, versionOptionText } from '../utils/labelRegister';
import { useCommonCodeOptions } from '../../../../shared/components/common-code/useCommonCodeOptions';
import { LabelCompanyDialog, LabelCopyDialog } from './LabelSideDialogs';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 이 창은 두 가지로 열린다(화면은 하나 — 창이 두 벌이면 한쪽만 고쳐지는 날이 반드시 온다)
//   제품 라벨       { code, name }
//   표시사항 요청   { requestId, name } — 확정 전이라 제품이 없다. 버전이 없고 배합표는 레시피에서 가져온다.
export type LabelFormTarget = { code: string; name: string; requestId?: undefined } | { code?: undefined; name: string; requestId: number };

const ZOOM_KEY = 'songyeon-label-preview-zoom';
const ZOOM_OPTIONS = ['1', '1.25', '1.5', '1.75', '2'];
const SIZE_OPTIONS = [{ value: '100x150', label: '100mm × 150mm' }, { value: '100x130', label: '100mm × 130mm' }];
// 2026-10-26 보관방법은 공통코드 STORAGE_METHOD 에서 고르고 코드를 저장한다. 라벨에는 그 이름을 찍는다
const STORAGE_GROUP = 'STORAGE_METHOD';
// 원재료명은 따로(서식 있는 글). 나머지 라벨 칸
const TEXT_FIELDS = ['foodType', 'netWeight', 'shelfLifeMonths', 'shelfLifeUnit', 'storage', 'packagingMaterial', 'allergens', 'manufactureReportNo'] as const;
type TextField = typeof TEXT_FIELDS[number];
type Form = Record<TextField, string>;
const EMPTY_FORM: Form = { foodType: '', netWeight: '', shelfLifeMonths: '', shelfLifeUnit: '월', storage: '', packagingMaterial: '', allergens: '', manufactureReportNo: '' };
const camel = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const metaSx = { color: 'text.secondary', fontSize: 12.5 };
const softBox = { border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' };
const today = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
const readZoom = () => {
  try {
    return localStorage.getItem(ZOOM_KEY) || '1.25';
  } catch {
    return '1.25';
  }
};
type Msg = { text: string; tone: 'info' | 'ok' | 'error' } | null;
type AllergenNote = { kind: 'filled' | 'differ' | 'applied'; data: LabelBomAllergens } | null;

export function LabelFormDialog({ target, onClose, onSaved }: { target: LabelFormTarget | null; onClose: () => void; onSaved: () => void }) {
  return target ? <LabelFormBody key={`${target.code ?? ''}|${target.requestId ?? ''}`} target={target} onClose={onClose} onSaved={onSaved} /> : null;
}

function LabelFormBody({ target, onClose, onSaved }: { target: LabelFormTarget; onClose: () => void; onSaved: () => void }) {
  const code = target.code ?? null;
  const requestId = target.requestId ?? null;
  const ask = useAsk('라벨 등록');
  const mfgDate = today();
  const formatCache = useRef<Record<string, LabelFormat | null>>({});
  const ingredientsRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fromPreview = useRef(false);

  const [ready, setReady] = useState(false);
  const [company, setCompany] = useState<LabelCompanyInfo>({});
  const [marks, setMarks] = useState<LabelMark[]>([]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [versions, setVersions] = useState<LabelVersion[]>([]);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [request, setRequest] = useState<LabelRequestDetail | null>(null);
  const [productName, setProductName] = useState(target.name);
  const [title, setTitle] = useState(requestId ? `표시사항 요청 — ${target.name}` : `라벨 등록 — ${target.name}`);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [ingredients, setIngredients] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [formatId, setFormatId] = useState('');
  const [format, setFormat] = useState<LabelFormat | null>(null);
  const [sizeSelect, setSizeSelect] = useState('100x150');
  const [markId, setMarkId] = useState('');
  const [markWidth, setMarkWidth] = useState('');
  const [zoom, setZoom] = useState(readZoom);
  const [bom, setBom] = useState<LabelBomState>({ kind: 'loading' });
  const [allergenNote, setAllergenNote] = useState<AllergenNote>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [dirty, setDirty] = useState(false);
  const [sizePx, setSizePx] = useState('');
  const [companyOpen, setCompanyOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const loadFormat = useCallback(async (id: string) => {
    if (!(id in formatCache.current)) formatCache.current[id] = await getLabelTemplate(id).then((t) => t.layout || null).catch(() => null);
    return formatCache.current[id];
  }, []);

  const setIngredientsHtml = (html: string) => {
    setIngredients(html);
    if (ingredientsRef.current) ingredientsRef.current.innerHTML = html;
  };

  // 라벨 한 장의 내용을 칸에 채운다(제품의 버전이든 표시사항 요청이든 들어있는 항목은 같다)
  const applyData = useCallback(async (v: LabelInfo, tpl: LabelTemplate[], mk: LabelMark[]) => {
    const layout = v.layout || {};
    const fmtId = layout.format_id ? String(layout.format_id) : '';
    const chosen = tpl.some((t) => String(t.id) === fmtId) ? fmtId : '';
    setFormatId(chosen);
    setFormat(chosen ? await loadFormat(chosen) : null);
    setSizeSelect(layout.size || '100x150');
    const next: Form = { ...EMPTY_FORM };
    TEXT_FIELDS.forEach((k) => {
      const value = (v as Record<string, unknown>)[k];
      next[k] = value == null || value === '' ? (k === 'shelfLifeUnit' ? '월' : '') : String(value);
    });
    setForm(next);
    setIngredientsHtml(v.ingredientsText || '');
    setExtra(Object.fromEntries(Object.entries(v.extra || {}).map(([k, val]) => [k, String(val ?? '')])));
    // 분리배출마크는 라벨 '모양' 쪽에 저장된다(양식·크기와 같은 자리)
    const rc = layout.recycle || {};
    const mark = mk.find((m) => String(m.id) === String(rc.mark_id));
    setMarkId(rc.mark_id && mark ? String(rc.mark_id) : '');
    setMarkWidth(String(rc.width_mm || (mark ? mark.widthMm : '') || ''));
    setDirty(false);
  }, [loadFormat]);

  // 버전 목록을 다시 받고 고른 버전(없으면 사용중)을 연다. 창을 열기만 해서는 버전이 만들어지지 않는다(처음 저장할 때 v1)
  const reloadVersions = useCallback(async (selectId: number | null, tpl: LabelTemplate[], mk: LabelMark[]) => {
    if (!code) return;
    const res = await listLabelVersions(code).catch(() => ({ versions: [] as LabelVersion[], currentId: null }));
    setVersions(res.versions || []);
    if (!res.currentId) {
      setVersionId(null);
      setForm(EMPTY_FORM);
      setIngredientsHtml('');
      setExtra({});
      setFormatId('');
      setFormat(null);
      setSizeSelect('100x150');
      setMarkId('');
      setMarkWidth('');
      setDirty(false);
      setMsg({ text: '새 라벨입니다. 칸을 채우고 저장하면 v1 이 만들어집니다.', tone: 'info' });
      return;
    }
    const id = selectId || res.currentId;
    setVersionId(id);
    await applyData(await getLabelVersion(id), tpl, mk);
  }, [code, applyData]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [info, mk, tpl] = await Promise.all([
        getLabelCompanyInfo().catch(() => ({} as LabelCompanyInfo)),
        listLabelMarks().catch(() => [] as LabelMark[]),
        listLabelTemplates().catch(() => [] as LabelTemplate[]),
      ]);
      if (!alive) return;
      setCompany(info);
      setMarks(mk);
      setTemplates(tpl);
      if (requestId) {
        const d = await fetchRequest(requestId);
        if (!alive) return;
        setRequest(d);
        setProductName(d.productName || target.name || '');
        setTitle(`표시사항 요청 — ${d.recipeName || target.name || ''}${d.clientName ? ` (${d.clientName})` : ''}`);
        await applyData(d, tpl, mk);
        setBom({ kind: 'rows', rows: d.bom || [] }); // 제품이 없으니 레시피의 배합표
      } else if (code) {
        await reloadVersions(null, tpl, mk);
        getLabelBom(code).then((rows) => alive && setBom({ kind: 'rows', rows })).catch(() => alive && setBom({ kind: 'error' }));
      }
      if (alive) setReady(true);
    })().catch(() => alive && setReady(true));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 원재료에 적어둔 알러지유발물질을 라벨로. 비어 있으면 채우고, 이미 적어둔 것이 다르면 알리기만 한다
  // (사람이 손으로 다듬어둔 문구를 말없이 지우면 안 된다). 버전을 연 뒤 한 번.
  const allergenChecked = useRef(false);
  useEffect(() => {
    if (!ready || !code || allergenChecked.current) return;
    allergenChecked.current = true;
    getLabelBomAllergens(code).then((data) => {
      if (!data || !data.text) return;
      setForm((cur) => {
        if (!cur.allergens.trim()) {
          setAllergenNote({ kind: 'filled', data });
          return { ...cur, allergens: data.text };
        }
        if (cur.allergens.trim() !== data.text) setAllergenNote({ kind: 'differ', data });
        return cur;
      });
    }).catch(() => undefined);
  }, [ready, code]);

  // 원재료명 칸은 다 불러온 뒤에야 그려진다. 그때 한 번 채운다(그 뒤로는 칸이 스스로 들고 있다)
  useEffect(() => {
    if (ready && ingredientsRef.current) ingredientsRef.current.innerHTML = ingredients;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const moved = Boolean(request?.movedProductCode);
  const editable = !moved;
  const hasVersion = versionId != null;
  const current = versions.find((v) => v.id === versionId) || null;
  const usedNow = versions.find((v) => v.isCurrent);
  const size = format?.paper ? `${format.paper.w}x${format.paper.h}` : sizeSelect;
  const recycle = markId ? { mark_id: parseInt(markId, 10), width_mm: parseFloat(markWidth) || undefined } : null;
  const extraFields = useMemo(() => extraFieldsOf(format, LABEL_STD_FIELDS), [format]);

  // 칸 값은 앞뒤 공백을 떼고 쓴다(송연 readLabelForm)
  const storageOptions = useCommonCodeOptions(STORAGE_GROUP);
  const storageName = (value: string) => storageOptions.find((option) => option.code === value)?.name ?? value;
  const info: LabelInfo = useMemo(() => {
    const out: Record<string, unknown> = {};
    TEXT_FIELDS.forEach((k) => { out[k] = form[k].trim(); });
    // 미리보기 · 인쇄에는 보관방법 코드 대신 공통코드 이름을 찍는다
    out.storage = storageOptions.find((option) => option.code === form.storage.trim())?.name ?? form.storage.trim();
    return {
      ...(out as LabelInfo),
      ingredientsText: ingredients.trim(),
      extra: Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v.trim()])),
    };
  }, [form, ingredients, extra, storageOptions]);
  const sheet: LabelSheet = { code, name: productName, mfgDate, info, companyInfo: company, format, recycle, marks };
  const previewHtml = buildLabelHTML(sheet);

  const edit = (key: TextField, value: string) => {
    setForm((cur) => ({ ...cur, [key]: value }));
    setDirty(true);
  };

  // ===== 미리보기 =====
  // 왼쪽 칸을 찾아 들어가지 않고 라벨 그림 위에서 바로 적을 수 있다. 고칠 수 있는 것은 '값' 칸뿐이다
  // (항목명·회사정보·주의사항은 양식이나 회사 고정정보에서 정한다). 미리보기 안에서 친 글자는 다시 그리지 않는다
  // — 그리는 순간 칸이 새로 만들어져 커서가 빠진다.
  const [pw, ph] = (size || '100x150').split('x');
  const zoomValue = Number.isNaN(parseFloat(zoom)) ? 1 : parseFloat(zoom);
  useEffect(() => {
    const box = previewRef.current;
    if (!box) return;
    if (fromPreview.current) {
      fromPreview.current = false;
      return;
    }
    box.innerHTML = `<style>${LABEL_CSS}</style>
      <div style="width:calc(${pw}mm * ${zoomValue});height:calc(${ph}mm * ${zoomValue});">
        <div style="width:${pw}mm;height:${ph}mm;outline:1px dashed #B9C0CC;background:#fff;transform:scale(${zoomValue});transform-origin:top left;">${previewHtml}</div>
      </div>
      <div style="width:calc(${pw}mm * ${zoomValue});margin-top:4px;color:#64748b;font-size:10.5px;text-align:center;">
        점선 = 라벨지 ${pw}×${ph}mm (인쇄되지 않습니다)${zoomValue !== 1 ? ` · 화면에서만 ${Math.round(zoomValue * 100)}% 확대` : ''}
      </div>`;
    if (!editable) return;
    const fmt = format || LABEL_FORMAT_BASIC;
    [...box.querySelectorAll('.lbl tr')].forEach((tr, r) => {
      const row = fmt.rows[r];
      if (!row) return;
      [...tr.children].forEach((el, c) => {
        const cell = row.cells[c];
        if (!cell || cell.type !== 'field' || !cell.field) return;
        const node = el as HTMLElement;
        const field = cell.field;
        node.contentEditable = 'true';
        node.title = '여기에 바로 적을 수 있어요';
        node.style.outline = '1px dashed #B9C0CC';
        node.style.outlineOffset = '-1px';
        node.addEventListener('focus', () => { node.style.outline = '2px solid #2F6FED'; });
        node.addEventListener('blur', () => { node.style.outline = '1px dashed #B9C0CC'; });
        node.addEventListener('input', () => {
          const v = (node.textContent || '').trim();
          fromPreview.current = true;
          if (field in LABEL_STD_FIELDS) setForm((cur) => ({ ...cur, [camel(field)]: v }));
          else setExtra((cur) => ({ ...cur, [field]: v }));
          setDirty(true);
        });
        // 엔터를 치면 줄이 바뀌어 라벨이 어그러진다. 대신 편집을 끝낸다
        node.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); node.blur(); } });
      });
    });
  }, [ready, previewHtml, pw, ph, zoomValue, format, editable]);

  // ===== 원재료명 서식(고른 글자만 굵게 · 크기) =====
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && ingredientsRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const syncIngredients = () => {
    setIngredients(ingredientsRef.current?.innerHTML || '');
    setDirty(true);
  };
  const doBold = () => {
    ingredientsRef.current?.focus();
    document.execCommand('bold', false);
    syncIngredients();
  };
  const doSize = async () => {
    const px = parseFloat(sizePx);
    if (!px) return;
    const range = savedRange.current;
    if (!range) {
      await ask.alert('먼저 원재료명에서 크기를 바꿀 부분을 드래그로 선택해주세요');
      return;
    }
    ingredientsRef.current?.focus();
    const frag = range.extractContents();
    // 안쪽에 이미 걸린 글자크기를 먼저 지운다(안 지우면 바깥에 새 크기를 씌워도 그 부분만 그대로 남는다)
    frag.querySelectorAll('*').forEach((node) => {
      const el = node as HTMLElement;
      el.style.removeProperty('font-size');
      if (el.tagName === 'FONT') el.removeAttribute('size');
      if (el.getAttribute('style') === '') el.removeAttribute('style');
    });
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    span.appendChild(frag);
    range.insertNode(span);
    // 방금 바꾼 부분을 선택된 채로 둔다(크기를 몇 번 바꿔가며 맞출 때 다시 드래그하지 않게)
    const after = document.createRange();
    after.selectNodeContents(span);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(after);
    savedRange.current = after.cloneRange();
    syncIngredients();
  };
  const doClear = () => {
    ingredientsRef.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    // 바깥 태그까지 쪼개서 걷어낸다
    document.execCommand('removeFormat', false);
    syncIngredients();
  };

  // ===== 양식 · 마크 =====
  const chooseFormat = async (id: string) => {
    setFormatId(id);
    setFormat(id ? await loadFormat(id) : null);
    setDirty(true);
  };

  // ===== 버전 =====
  const openVersion = async (id: number) => {
    if (id === versionId) return;
    if (dirty && !(await ask.confirm('저장하지 않은 수정이 있습니다.\n버리고 다른 버전을 열까요?'))) return;
    setVersionId(id);
    await applyData(await getLabelVersion(id), templates, marks);
  };

  const newVersion = async () => {
    if (!code) return;
    const r = await ask.prompt2('새 버전을 만듭니다.\n지금 보고 있는 내용을 복사해서 시작합니다.',
      { label: '버전 이름', value: nextVersionName(versions) }, { label: '메모 (무엇을 바꾸는지, 비워도 됩니다)', value: '' });
    if (!r) return;
    try {
      const made = await createVersion(code, { fromVersionId: versionId, versionLabel: r.value, note: r.value2 });
      await reloadVersions(made.id, templates, marks);
      setMsg({ text: `${made.versionLabel} 을 만들었습니다. 고친 뒤 '저장' 하고, '이 버전 사용'을 눌러야 인쇄에 반영됩니다.`, tone: 'info' });
    } catch (e) {
      await ask.alert(errorText(e, '새 버전을 만들지 못했어요'));
    }
  };

  const renameCurrent = async () => {
    if (!current) return;
    const r = await ask.prompt2('이 버전의 이름과 메모를 바꿉니다.', { label: '버전 이름', value: current.versionLabel || '' }, { label: '메모 (비워도 됩니다)', value: current.note || '' });
    if (!r) return;
    try {
      await renameVersion(current.id, { versionLabel: r.value, note: r.value2 });
      const keepDirty = dirty;
      const res = await listLabelVersions(code as string);
      setVersions(res.versions || []);
      setDirty(keepDirty);
    } catch (e) {
      await ask.alert(errorText(e, '바꾸지 못했어요'));
    }
  };

  const makeCurrentInUse = async () => {
    if (!current || current.isCurrent) return;
    if (dirty && !(await ask.confirm('저장하지 않은 수정이 있습니다. 먼저 저장해주세요.\n그래도 진행할까요?'))) return;
    if (!(await ask.confirm(`앞으로 "${current.versionLabel}" 내용으로 인쇄됩니다.\n진행할까요?`))) return;
    try {
      await setVersionInUse(current.id);
      await reloadVersions(current.id, templates, marks);
      onSaved();
    } catch (e) {
      await ask.alert(errorText(e, '바꾸지 못했어요'));
    }
  };

  const deleteCurrent = async () => {
    if (!current) return;
    if (!(await ask.confirm(`"${current.versionLabel}" 을 지울까요?\n되돌릴 수 없습니다.`, true))) return;
    try {
      await deleteVersion(current.id);
      await reloadVersions(null, templates, marks);
      onSaved();
    } catch (e) {
      await ask.alert(errorText(e, '지우지 못했어요'));
    }
  };

  // ===== 저장 · 인쇄 =====
  const content = () => ({
    foodType: info.foodType, netWeight: info.netWeight, shelfLifeMonths: info.shelfLifeMonths, shelfLifeUnit: info.shelfLifeUnit,
    manufactureReportNo: info.manufactureReportNo, packagingMaterial: info.packagingMaterial, ingredientsText: info.ingredientsText,
    allergens: info.allergens, storage: form.storage.trim(), extra: info.extra || {}, // 2026-10-26 보관방법은 코드로 저장
  });
  // 라벨의 '모양'. 제품 라벨은 따로 저장하지만 요청은 한 줄뿐이라 같이 보낸다
  const layout = () => ({ size, format_id: parseInt(formatId, 10) || null, recycle });

  const save = async () => {
    if (requestId) {
      try {
        await saveRequest(requestId, { ...content(), productName: productName.trim(), layout: layout(), note: request?.note || null });
      } catch (e) {
        setMsg({ text: errorText(e, '저장에 실패했어요'), tone: 'error' });
        return;
      }
      setDirty(false);
      setMsg({ text: '저장되었습니다. 제품이 등록되면 표시사항 요청 목록에서 옮기세요.', tone: 'ok' });
      onSaved();
      return;
    }
    if (!code) return;
    let saved: { versionId: number; isCurrent: boolean };
    try {
      // 지금 보고 있는 버전에 저장한다. 사용중이 아닌 옛 버전을 고쳐도 실제 인쇄 내용은 바뀌지 않는다
      saved = await saveLabel(code, { versionId, ...content() });
      // 양식과 크기는 라벨 '내용' 이 아니라 '모양' 이라 따로 저장한다
      await saveLayout(code, { versionId: saved.versionId, ...layout() });
    } catch (e) {
      setMsg({ text: errorText(e, '저장에 실패했어요'), tone: 'error' });
      return;
    }
    setDirty(false);
    if (versionId == null) {
      // 처음 저장해서 v1 이 생겼다. 버전 줄을 새로 받는다
      const res = await listLabelVersions(code).catch(() => ({ versions: [] as LabelVersion[], currentId: null }));
      setVersions(res.versions || []);
      setVersionId(saved.versionId);
    }
    setMsg({
      text: !saved.isCurrent && current ? `${current.versionLabel} 에 저장되었습니다. 아직 사용중이 아니라 인쇄 내용은 그대로입니다.` : '저장되었습니다',
      tone: 'ok',
    });
    onSaved();
  };

  const print = () => {
    const win = window.open('', '_blank');
    if (!win) {
      setMsg({ text: '새 창을 열 수 없어요. 브라우저의 팝업 차단을 풀어주세요.', tone: 'error' });
      return;
    }
    win.document.write(buildLabelPrintDocument(sheet, size));
    win.document.close();
  };

  // 다른 제품 라벨 가져오기: 품목제조보고번호는 가져오지 않는다(품목마다 따로 받은 번호라 남의 번호가 찍히면 잘못된 표시)
  const applyCopy = (v: LabelInfo, fromName: string) => {
    setForm((cur) => {
      const next = { ...cur };
      TEXT_FIELDS.forEach((k) => {
        if (k === 'manufactureReportNo') return;
        const value = (v as Record<string, unknown>)[k];
        next[k] = value == null || value === '' ? (k === 'shelfLifeUnit' ? '월' : '') : String(value);
      });
      return next;
    });
    setIngredientsHtml(v.ingredientsText || '');
    if (v.layout?.size) setSizeSelect(v.layout.size);
    setDirty(true);
    setCopyOpen(false);
    setMsg({ text: `"${fromName}" 의 라벨을 가져왔습니다. 품목제조보고번호는 직접 넣어주세요. 아직 저장 전입니다.`, tone: 'info' });
  };

  const missing = missingLabelItems(info, company);
  const sourceText = allergenNote ? allergenNote.data.sources.map((s) => `${s.materialName}(${s.allergens.join('·')})`).join(', ') : '';
  const field = (key: TextField, label: string, placeholder: string, extraProps: Record<string, unknown> = {}) => (
    <TextField
      size="small" margin="none" fullWidth label={label} placeholder={placeholder} value={form[key]} disabled={!editable}
      onChange={(event) => edit(key, event.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': label } }} {...extraProps}
    />
  );

  return (
    <Dialog open onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width: 'min(1480px, 96vw)', maxHeight: '92vh' } } }} aria-labelledby="label-form-title">
      <DialogTitle id="label-form-title" sx={{ fontSize: 16, fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent dividers>
        {!ready && <Typography sx={{ ...metaSx, p: 2 }}>불러오는 중...</Typography>}
        {ready && (
          <>
            {/* 라벨 수정 이력. 고쳐도 이전 내용이 그대로 남고, 옛 버전 그대로 다시 인쇄할 수 있다(버전은 제품마다 따로) */}
            {!requestId && (
              <Box aria-label="라벨 버전" sx={{ ...softBox, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', px: 1.25, py: 1, mb: 1.25 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>버전</Typography>
                {hasVersion && (
                  <>
                    <TextField
                      select size="small" margin="none" value={String(versionId)} onChange={(event) => void openVersion(Number(event.target.value))}
                      slotProps={{ htmlInput: { 'aria-label': '라벨 버전 고르기' } }} sx={{ width: 340, maxWidth: '100%', flex: '0 0 auto' }}
                    >
                      {versions.map((v) => <MenuItem key={v.id} value={String(v.id)}>{versionOptionText(v)}</MenuItem>)}
                    </TextField>
                    <Button size="small" variant="outlined" onClick={() => void newVersion()}>＋ 새 버전</Button>
                    <Button size="small" variant="outlined" onClick={() => void renameCurrent()}>이름·메모</Button>
                    <Button size="small" variant="outlined" disabled={Boolean(current?.isCurrent)} onClick={() => void makeCurrentInUse()}>이 버전 사용</Button>
                    <Button size="small" variant="outlined" color="error" disabled={Boolean(current?.isCurrent) || versions.length <= 1} onClick={() => void deleteCurrent()}>삭제</Button>
                  </>
                )}
                <Typography sx={{ ...metaSx, fontSize: 11.5 }}>
                  {hasVersion ? (current?.note ? `메모: ${current.note}` : '') : '아직 버전이 없습니다. 칸을 채우고 저장하면 v1 이 만들어집니다.'}
                </Typography>
              </Box>
            )}
            {editable && (
              <Box sx={{ mb: 1.25 }}>
                <Button size="small" variant="outlined" onClick={() => setCopyOpen(true)}>📋 다른 제품 라벨 가져오기</Button>
              </Box>
            )}
            {current && !current.isCurrent && (
              <Alert severity="warning" icon={false} sx={{ mb: 1.25, fontSize: 12, lineHeight: 1.6 }}>
                지금 보고 있는 <b>{current.versionLabel}</b> 은 사용중이 아닙니다. 실제로 인쇄되는 라벨은 <b>{usedNow ? usedNow.versionLabel : '-'}</b> 입니다.<br />
                이 버전으로 바꾸려면 <b>‘이 버전 사용’</b>을 눌러주세요. (여기서 인쇄하면 이 버전 내용으로 나옵니다)
              </Alert>
            )}
            {moved && (
              <Alert severity="warning" icon={false} sx={{ mb: 1.25, fontSize: 12 }}>
                이미 제품 <b>{request?.movedProductCode}</b> 의 라벨로 옮겼습니다. 고치려면 라벨등록 탭에서 그 제품을 여세요.
              </Alert>
            )}
            {requestId && (
              <Box sx={{ ...softBox, px: 1.25, py: 1, mb: 1.25, fontSize: 12, lineHeight: 1.6 }}>
                아직 <b>확정 전</b>이라 제품이 없는 건입니다. 적는 칸은 라벨등록과 같습니다.<br />
                <b>제품명</b>과 <b>품목보고번호</b>는 아직 안 정해졌을 수 있으니 비워두거나 임시로 적어도 됩니다.
                제품이 등록되면 <b>표시사항 요청</b> 목록에서 그 제품으로 옮기세요.
              </Box>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.25, alignItems: 'flex-start' }}>
              <LabelBomPanel bom={bom} title={requestId ? '이 레시피의 원재료' : '이 제품의 원재료 (제품BOM)'} />

              {/* 가운데: 칸에 입력 */}
              <Box sx={{ flex: 1, minWidth: { xs: 0, sm: 330 }, maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Typography sx={metaSx}>칸을 채우면 오른쪽 미리보기에 바로 반영됩니다. 회사 정보와 주의사항은 모든 라벨에 공통으로 들어갑니다.</Typography>
                <TextField
                  size="small" margin="none" fullWidth label="제품명" value={productName}
                  slotProps={{ inputLabel: { shrink: true }, input: { readOnly: !requestId || !editable }, htmlInput: { 'aria-label': '제품명' } }}
                  onChange={(event) => { setProductName(event.target.value); setDirty(true); }}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
                  {field('foodType', '식품유형', '예: 소스(살균제품)')}
                  {field('netWeight', '내용량', '예: 5Kg')}
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>제조년월일</Typography>
                    <Box sx={{ ...softBox, px: 1.25, py: 1, fontSize: 13 }} aria-label="제조년월일">
                      {labelPrintDateKr(mfgDate)}{' '}
                      <Typography component="span" sx={{ ...metaSx, fontSize: 11.5 }}>— 미리보기용(오늘). 인쇄할 때 생산확정 날짜가 들어갑니다</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    {field('shelfLifeMonths', '소비기한(제조일로부터)', '예: 6', { type: 'number', slotProps: { inputLabel: { shrink: true }, htmlInput: { 'aria-label': '소비기한', min: 1 } } })}
                    <TextField
                      select size="small" margin="none" label="단위" value={form.shelfLifeUnit || '월'} disabled={!editable}
                      onChange={(event) => edit('shelfLifeUnit', event.target.value)} sx={{ width: 76, flex: '0 0 76px' }}
                      slotProps={{ htmlInput: { 'aria-label': '소비기한 단위' } }}
                    >
                      {['년', '월', '일'].map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                    </TextField>
                  </Box>
                  {/* 2026-10-26 보관방법: 공통코드 STORAGE_METHOD 에서만 고른다(저장은 코드, 라벨에는 이름) */}
                  <TextField
                    select size="small" margin="none" label="보관방법" value={form.storage} disabled={!editable}
                    onChange={(event) => edit('storage', event.target.value)}
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '보관방법' } }}
                  >
                    <MenuItem value="">선택 안 함</MenuItem>
                    {storageOptions.map((option) => (
                      <MenuItem key={option.code} value={option.code}>{option.name}</MenuItem>
                    ))}
                    {form.storage && storageOptions.length > 0 && !storageOptions.some((option) => option.code === form.storage) ? (
                      <MenuItem value={form.storage}>{storageName(form.storage)} (다시 골라주세요)</MenuItem>
                    ) : null}
                  </TextField>
                  <Box sx={{ gridColumn: '1 / -1' }}>{field('packagingMaterial', '포장재질(내면)', '예: 폴리에틸렌(PE)')}</Box>
                </Box>

                <Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.25 }}>원재료명 및 함량</Typography>
                  {editable && (
                    <>
                      <Typography sx={{ ...metaSx, fontSize: 11.5, mb: 0.5 }}>일부 글자만 작게 하거나 굵게 하려면, 그 부분을 마우스로 끌어 선택한 뒤 아래 버튼을 누르세요.</Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.75, flexWrap: 'wrap' }}>
                        <Button size="small" variant="outlined" title="선택한 글자 굵게" onMouseDown={(e) => e.preventDefault()} onClick={doBold} sx={{ minWidth: 30, px: 0, fontWeight: 800 }}>B</Button>
                        <TextField size="small" margin="none" type="number" placeholder="크기(px)" value={sizePx} onChange={(e) => setSizePx(e.target.value)}
                          slotProps={{ htmlInput: { 'aria-label': '글자 크기(px)', min: 1 } }} sx={{ width: 100 }} />
                        <Button size="small" variant="outlined" onMouseDown={(e) => e.preventDefault()} onClick={() => void doSize()}>크기적용</Button>
                        <Button size="small" variant="outlined" onMouseDown={(e) => e.preventDefault()} onClick={doClear}>서식지우기</Button>
                      </Box>
                    </>
                  )}
                  <Box
                    ref={ingredientsRef} aria-label="원재료명 및 함량" role="textbox" aria-multiline="true"
                    contentEditable={editable} suppressContentEditableWarning
                    onInput={syncIngredients} onMouseUp={saveRange} onKeyUp={saveRange}
                    sx={{
                      minHeight: 110, px: 1.25, py: 1, fontSize: 12.5, lineHeight: 1.6, border: '1px solid', borderColor: 'divider', borderRadius: 1,
                      bgcolor: editable ? 'background.paper' : 'action.hover', outline: 'none', '&:focus': { borderColor: 'primary.main' },
                    }}
                  />
                </Box>

                {/* 고른 양식에만 있는 항목(예: 유통전문판매원). 양식에 항목을 넣으면 여기에 칸이 저절로 생긴다 */}
                {extraFields.map((f) => (
                  <TextField
                    key={f} size="small" margin="none" fullWidth label={f} value={extra[f] ?? ''} disabled={!editable}
                    onChange={(event) => { setExtra((cur) => ({ ...cur, [f]: event.target.value })); setDirty(true); }}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': f } }}
                  />
                ))}

                <Box>
                  {field('allergens', '알러지유발원재료', '예: 대두,밀,조개류(굴),쇠고기,우유 함유')}
                  {allergenNote && (
                    <Alert severity="warning" icon={false} sx={{ mt: 0.75, py: 0, fontSize: 11.5, lineHeight: 1.6 }}>
                      {allergenNote.kind === 'filled' && <>배합표의 원재료에서 자동으로 채웠습니다 — <b>{sourceText}</b></>}
                      {allergenNote.kind === 'applied' && <>배합표 기준으로 바꿨습니다 — <b>{sourceText}</b></>}
                      {allergenNote.kind === 'differ' && (
                        <>
                          배합표 기준으로는 <b>{allergenNote.data.text}</b> 입니다 ({sourceText}). 적어둔 내용과 다릅니다.
                          <Button size="small" sx={{ ml: 0.5, minWidth: 0, py: 0, fontSize: 11 }}
                            onClick={() => { edit('allergens', allergenNote.data.text); setAllergenNote({ kind: 'applied', data: allergenNote.data }); }}>
                            배합표 기준으로 바꾸기
                          </Button>
                        </>
                      )}
                    </Alert>
                  )}
                </Box>
                {field('manufactureReportNo', '품목제조보고번호', '예: 20160347193-1452')}

                {/* 분리배출마크. 라벨지에 미리 인쇄된 해썹 마크와 달리 우리가 찍는다(제품마다 포장재질이 달라 여기서 고른다) */}
                <Box>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                    <TextField
                      select size="small" margin="none" label="분리배출마크" value={markId} sx={{ flex: 1, minWidth: 150 }} disabled={!editable}
                      slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '분리배출마크' } }}
                      onChange={(event) => {
                        const mark = marks.find((m) => String(m.id) === event.target.value);
                        setMarkId(event.target.value);
                        setMarkWidth(mark ? String(mark.widthMm || 9) : ''); // 마크를 바꾸면 그 마크의 기본 크기
                        setDirty(true);
                      }}
                    >
                      <MenuItem value="">없음</MenuItem>
                      {marks.map((m) => <MenuItem key={m.id} value={String(m.id)}>{m.name}</MenuItem>)}
                    </TextField>
                    <TextField
                      type="number" size="small" margin="none" label="가로(mm)" value={markWidth} sx={{ width: 100 }} disabled={!editable}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: 100, step: 0.5, 'aria-label': '분리배출마크 가로 크기' } }}
                      onChange={(event) => { setMarkWidth(event.target.value); setDirty(true); }}
                    />
                  </Box>
                  <Typography sx={{ ...metaSx, fontSize: 11.5, mt: 0.5 }}>마크는 품질관리 &gt; 라벨등록 &gt; 라벨양식 탭의 ‘마크 등록’ 에서 넣습니다</Typography>
                </Box>
                <TextField
                  select size="small" margin="none" label="라벨 양식" value={formatId} disabled={!editable}
                  slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true }, htmlInput: { 'aria-label': '라벨 양식' } }}
                  onChange={(event) => void chooseFormat(event.target.value)}
                >
                  <MenuItem value="">기본 양식</MenuItem>
                  {templates.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}{t.size ? ` (${t.size})` : ''}</MenuItem>)}
                </TextField>
                {!formatId && (
                  <TextField
                    select size="small" margin="none" label="라벨 크기" value={SIZE_OPTIONS.some((o) => o.value === sizeSelect) ? sizeSelect : ''} disabled={!editable}
                    onChange={(event) => { setSizeSelect(event.target.value); setDirty(true); }} slotProps={{ htmlInput: { 'aria-label': '라벨 크기' } }}
                  >
                    {SIZE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                )}
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {editable && <Button variant="contained" onClick={() => void save()}>저장</Button>}
                  <Button variant="contained" color="inherit" startIcon={<PrintIcon />} disabled={!requestId && !hasVersion} onClick={print}>인쇄</Button>
                  <Button variant="outlined" onClick={() => setCompanyOpen(true)}>회사 고정정보 설정</Button>
                </Box>
                {msg && (
                  <Typography role="status" sx={{ fontSize: 12.5, color: msg.tone === 'error' ? 'error.main' : msg.tone === 'ok' ? 'success.main' : 'text.secondary' }}>{msg.text}</Typography>
                )}
                <Typography sx={{ ...metaSx, fontSize: 11.5, lineHeight: 1.6 }}>
                  인쇄물 위아래에 <b>날짜·시간·주소</b>가 같이 찍힌다면, 인쇄 창에서 <b>여백을 '없음'</b>으로 하고
                  <b> '머리글 및 바닥글' 체크를 해제</b>해주세요. 한 번만 해두면 그 PC에서는 계속 기억합니다.
                </Typography>
                {missing.length > 0 && <Alert severity="warning" sx={{ fontSize: 11.5 }}>아직 비어 있는 항목: {missing.join(', ')}</Alert>}
              </Box>

              {/* 오른쪽: 실제 인쇄될 모양 그대로. 배율은 화면에서만, 인쇄는 늘 실제 크기 */}
              <Box sx={{ flex: 1, minWidth: { xs: 0, sm: `calc(${pw}mm * ${zoomValue} + 22px)` }, maxWidth: '100%' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
                  <Typography sx={metaSx}>미리보기</Typography>
                  <TextField
                    select size="small" margin="none" value={zoom} slotProps={{ htmlInput: { 'aria-label': '미리보기 배율' } }} sx={{ width: 160 }}
                    onChange={(event) => {
                      setZoom(event.target.value);
                      try {
                        localStorage.setItem(ZOOM_KEY, event.target.value);
                      } catch {
                        // 저장 못 해도 이번 창에서는 쓴다
                      }
                    }}
                  >
                    {ZOOM_OPTIONS.map((o) => <MenuItem key={o} value={o}>{o === '1' ? '100% (실제 크기)' : `${Math.round(parseFloat(o) * 100)}%`}</MenuItem>)}
                  </TextField>
                  <Typography sx={{ ...metaSx, fontSize: 11.5 }}>인쇄는 배율과 상관없이 실제 크기로 나갑니다</Typography>
                </Box>
                <Box ref={previewRef} aria-label="라벨 미리보기" sx={{ ...softBox, maxHeight: '64vh', overflow: 'auto', p: 1.25 }} />
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
      <LabelCompanyDialog
        open={companyOpen} onClose={() => setCompanyOpen(false)}
        onSaved={(info) => setCompany(info)} // 회사 정보가 바뀌면 열려 있는 미리보기도 새로 그린다
      />
      <LabelCopyDialog open={copyOpen} exclude={code || ''} onClose={() => setCopyOpen(false)} onPick={(v, name) => applyCopy(v, name)} />
      {ask.node}
    </Dialog>
  );
}
