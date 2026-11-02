import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useAsk } from '../../../../../shared/components/AskDialog/useAsk';
import {
  cancelShare, clearFolderLock, createFolder, deleteFile, deleteFolder, downloadFile, fetchDepartments, fetchFiles, fetchFolders, fetchMe,
  fetchSharesByMe, fetchSharesToMe, renameFolder, setFolderLock, unlockFolder, uploadFiles,
} from '../services/documentBox.service';
import type {
  BoxRow, DocFile, DocFolder, DocKind, DocPlace, DocShare, DocUser, ShareRow, ShareTab, ShareTarget,
} from '../types/documentBox.types';
import {
  childFolders, dateOnly, docPath, folderById, isPeeking, ownerOptions, sizeText, uploadResultText,
} from '../utils/documentBox';

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// 문서함 화면의 자리(탭 · 폴더) · 폴더 · 파일 · 공유 상태
export function useDocumentBoxManagement() {
  const [me, setMe] = useState<DocUser | null>(null);
  const [folders, setFolders] = useState<DocFolder[]>([]);
  const [place, setPlace] = useState<DocPlace>({ kind: '공용', currentId: null, ownerFilter: null, sharedRootId: null });
  const [files, setFiles] = useState<DocFile[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [filesKey, setFilesKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; ok: boolean | null } | null>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [shareTab, setShareTab] = useState<ShareTab>('mine');
  const [sharesToMe, setSharesToMe] = useState<DocShare[]>([]);
  const [sharesByMe, setSharesByMe] = useState<DocShare[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const ask = useAsk('문서함');

  const loadFolders = useCallback(async () => {
    try {
      setFolders(await fetchFolders());
    } catch {
      setFolders([]);
    }
  }, []);
  const loadShares = useCallback(async () => {
    const [mine, sent] = await Promise.all([fetchSharesToMe().catch(() => []), fetchSharesByMe().catch(() => [])]);
    setSharesToMe(mine);
    setSharesByMe(sent);
  }, []);
  const refresh = useCallback(async () => {
    await loadFolders();
    setFilesKey((v) => v + 1);
  }, [loadFolders]);

  useEffect(() => {
    fetchMe().then((user) => setMe(user)).catch(() => undefined);
    void loadFolders();
  }, [loadFolders]);

  const shareView = place.kind === '공유' && place.sharedRootId == null;
  useEffect(() => {
    if (shareView) void loadShares();
  }, [shareView, shareTab, loadShares]);

  // 폴더를 열면 그 안 파일을 받는다. 잠긴 폴더로 곧장 들어온 경우 등은 빈 목록이 아니라 왜 안 보이는지 알려준다
  useEffect(() => {
    if (place.currentId == null) {
      setFiles([]);
      setBlocked(null);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchFiles(place.currentId)
      .then((rows) => { if (alive) { setFiles(rows); setBlocked(null); } })
      .catch((requestError) => { if (alive) { setFiles([]); setBlocked(errorText(requestError, '이 폴더를 볼 수 없어요')); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [place.currentId, filesKey]);

  const atRoot = place.currentId == null;
  const peeking = isPeeking(place, me);
  const path = useMemo(() => docPath(folders, place), [folders, place]);
  const children = useMemo(() => (shareView ? [] : childFolders(folders, place)), [folders, place, shareView]);
  const canUpload = !shareView && !atRoot && !peeking && !blocked;
  const canNewFolder = !shareView && !peeking && !blocked;

  // ===== 옮겨 다니기 =====
  const switchKind = (kind: DocKind) => {
    // 탭을 바꾸면 최상위로 돌아간다. 열어둔 폴더가 다른 탭 것일 수 있다
    setPlace({ kind, currentId: null, ownerFilter: kind === '개인' ? me?.id ?? null : null, sharedRootId: null });
    setUploadMsg(null);
  };

  const selectOwner = (ownerId: string) => {
    setPlace((cur) => ({ ...cur, ownerFilter: ownerId, currentId: null }));
  };

  // 잠긴 폴더는 들어가기 전에 묻는다. 들어간 뒤에 빈 화면을 보여주면 폴더가 비었는지 잠긴 건지 알 수 없다
  const askUnlock = async (id: number, name: string): Promise<boolean> => {
    const pw = await ask.promptPassword(`'${name}' 폴더의 비밀번호를 넣어주세요`);
    if (pw == null || pw === '') return false;
    try {
      await unlockFolder(id, pw);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '열지 못했어요'));
      return false;
    }
    await loadFolders(); // 잠긴 동안 감춰뒀던 하위폴더를 다시 받아온다
    return true;
  };

  const openFolder = async (f: DocFolder) => {
    if (f.locked && !f.unlocked && !(await askUnlock(f.id, f.name))) return;
    setPlace((cur) => ({ ...cur, currentId: f.id }));
    setUploadMsg(null);
  };

  // 공유받은 폴더를 열어 들어간다. 공유는 잠금을 열어주지 않는다 — 보낸 사람이 비밀번호를 따로 알려줘야 한다
  const openSharedFolder = async (id: number, name: string) => {
    const f = folderById(folders, id);
    if (f && f.locked && !f.unlocked && !(await askUnlock(id, f.name || name))) return;
    setPlace((cur) => ({ ...cur, sharedRootId: id, currentId: id }));
  };

  const goCrumb = (id: number | null) => {
    if (id == null && place.sharedRootId != null) {
      // 공유받은 폴더에서 나가면 공유문서함으로 돌아간다('전체' 로 가면 볼 자격도 없는 남의 폴더 목록을 보러 가는 셈이 된다)
      setPlace((cur) => ({ ...cur, sharedRootId: null, currentId: null }));
      void loadShares();
      return;
    }
    setPlace((cur) => ({ ...cur, currentId: id }));
    setUploadMsg(null);
  };

  // ===== 폴더 =====
  const openFolderDialog = async () => {
    if (atRoot && place.kind === '공용') setDepartments(await fetchDepartments().catch(() => []));
    setFolderDialog(true);
  };

  const saveFolder = async (name: string, department: string): Promise<string | null> => {
    try {
      await createFolder({
        name, parentId: place.currentId,
        ...(place.currentId == null ? { kind: place.kind, ...(place.kind === '공용' ? { department } : {}) } : {}),
      });
    } catch (requestError) {
      return errorText(requestError, '폴더를 만들지 못했어요');
    }
    setFolderDialog(false);
    await refresh();
    return null;
  };

  const doRename = async (f: DocFolder) => {
    const name = await ask.prompt('새 폴더명을 입력해주세요', f.name);
    if (!name || name === f.name) return;
    try {
      await renameFolder(f.id, name);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '이름을 바꾸지 못했어요'));
    }
  };

  // 안이 비어있을 때만 지운다. 통째로 지우면 실수로 부서 전체를 날리게 된다
  const doDeleteFolder = async (f: DocFolder) => {
    if (!(await ask.confirm(`"${f.name}" 폴더를 지울까요?`, true))) return;
    try {
      await deleteFolder(f.id);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '폴더를 지우지 못했어요'));
    }
  };

  // '걸기' 와 '없애기' 는 단추를 갈라 둔다. 취소는 언제나 '아무 일도 안 함' 이어야 한다
  const doLock = async (f: DocFolder) => {
    let current = '';
    // 관리자는 지금 비밀번호를 몰라도 새로 정해줄 수 있다(잊어버린 폴더를 열어줘야 하는 사람이다)
    if (f.locked && !me?.admin) {
      const cur = await ask.promptPassword('지금 비밀번호를 넣어주세요');
      if (cur == null || cur === '') return;
      current = cur;
    }
    const pw = await ask.promptPassword(f.locked ? '새 비밀번호를 정해주세요 (4자 이상)' : `'${f.name}' 폴더에 걸 비밀번호를 정해주세요 (4자 이상)`);
    if (pw == null || pw === '') return;
    try {
      await setFolderLock(f.id, pw, current);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '걸지 못했어요'));
    }
  };

  const doClearLock = async (f: DocFolder) => {
    if (!(await ask.confirm(`'${f.name}' 폴더의 비밀번호를 없앨까요?\n이 폴더를 볼 수 있는 사람은 누구나 열게 됩니다.`))) return;
    let current = '';
    if (!me?.admin) {
      const cur = await ask.promptPassword('지금 비밀번호를 넣어주세요');
      if (cur == null || cur === '') return;
      current = cur;
    }
    try {
      await clearFolderLock(f.id, current);
      await refresh();
    } catch (requestError) {
      await ask.alert(errorText(requestError, '없애지 못했어요'));
    }
  };

  // ===== 파일 =====
  // 단추로 고르든 끌어다 놓든 여기로 모인다. 두 갈래로 두면 한쪽만 고쳐진다
  const doUpload = async (picked: File[]) => {
    if (picked.length === 0 || place.currentId == null) return;
    setUploadMsg({ text: '올리는 중...', ok: null });
    try {
      const result = await uploadFiles(place.currentId, picked);
      setUploadMsg({ text: uploadResultText(result.saved, result.errors), ok: true });
      if (result.errors && result.errors.length) await ask.alert(`올리지 못한 파일:\n${result.errors.join('\n')}`);
      await refresh();
    } catch (requestError) {
      setUploadMsg({ text: errorText(requestError, '올리지 못했어요'), ok: false });
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = ''; // 같은 파일을 다시 골라도 change 가 뜨도록 비워둔다
    void doUpload(picked);
  };

  const doDownload = async (id: number, name: string) => {
    try {
      await downloadFile(id, name);
    } catch (requestError) {
      await ask.alert(errorText(requestError, '내려받지 못했어요'));
    }
  };

  const doDeleteFile = async (f: DocFile) => {
    if (!(await ask.confirm(`"${f.origName}" 파일을 지울까요?`, true))) return;
    try {
      await deleteFile(f.id);
      await refresh();
    } catch {
      await ask.alert('파일을 지우지 못했어요');
    }
  };

  const doCancelShare = async (s: DocShare) => {
    if (!(await ask.confirm(`${s.toName || ''}님에게 보낸 공유를 취소할까요?`, true))) return;
    try {
      await cancelShare(s.id);
      await loadShares();
    } catch {
      await ask.alert('취소하지 못했어요');
    }
  };

  const afterShared = () => setFilesKey((v) => v + 1);

  // ===== 표 =====
  const boxRows = useMemo<BoxRow[]>(() => [
    ...children.map((f) => ({ key: `f${f.id}`, type: 'folder' as const, name: f.name, by: f.createdBy || '', date: dateOnly(f.createdAt), size: '', folder: f })),
    ...files.map((f) => ({ key: `a${f.id}`, type: 'file' as const, name: f.origName, by: f.uploadedBy || '', date: dateOnly(f.createdAt), size: sizeText(f.sizeBytes), file: f })),
  ], [children, files]);

  const mineRows = useMemo<ShareRow[]>(() => sharesToMe.map((s) => ({ ...s, key: `m${s.id}` })), [sharesToMe]);
  const sentRows = useMemo<ShareRow[]>(() => sharesByMe.map((s) => ({ ...s, key: `s${s.id}` })), [sharesByMe]);

  const owners = ownerOptions(folders, me);

  return {
    me,
    place,
    blocked,
    loading,
    uploadMsg,
    folderDialog,
    setFolderDialog,
    departments,
    shareTarget,
    setShareTarget,
    shareTab,
    setShareTab,
    fileInput,
    askNode: ask.node,
    shareView,
    atRoot,
    peeking,
    path,
    canUpload,
    canNewFolder,
    owners,
    boxRows,
    mineRows,
    sentRows,
    switchKind,
    selectOwner,
    openFolder,
    openSharedFolder,
    goCrumb,
    openFolderDialog,
    saveFolder,
    doRename,
    doDeleteFolder,
    doLock,
    doClearLock,
    doUpload,
    handleFileInputChange,
    doDownload,
    doDeleteFile,
    doCancelShare,
    afterShared,
  };
}
