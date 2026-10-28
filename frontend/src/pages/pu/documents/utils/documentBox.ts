// 구매관리 > 문서함 (송연 28-documents.js)
// 서버는 폴더를 나무 모양으로 주지 않고 한 줄씩(부모 번호를 달아서) 준다.
// 지금 열어둔 폴더를 부모로 갖는 것만 골라 보여주면 그게 그 폴더의 안이다. 최상위는 부모가 없는 것들이다.
// 볼 수 없는 폴더는 서버가 아예 안 준다. 여기서 숨기는 것이 아니다.

export type DocKind = '공용' | '개인' | '공유';

export type DocUser = { id: string; name?: string | null; department?: string | null; admin: boolean };

export type DocFolder = {
  id: number;
  parentId?: number | null;
  name: string;
  createdBy?: string | null;
  createdAt?: string | null;
  kind?: string | null;
  department?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  lockBy?: string | null;
  lockAt?: string | null;
  fileCount?: number | null;
  childCount?: number | null;
  rootKind?: string | null;
  rootOwnerId?: string | null;
  rootOwnerName?: string | null;
  sharedRootId?: number | null;
  sharedRoot?: boolean;
  mine?: boolean;
  locked?: boolean;
  unlocked?: boolean;
};

export type DocFile = { id: number; origName: string; sizeBytes?: number | null; uploadedBy?: string | null; createdAt?: string | null; shareCount?: number | null };

export type DocShare = {
  id: number;
  attachmentId?: number | null;
  folderId?: number | null;
  toEmployeeId?: string | null;
  toName?: string | null;
  sharedByName?: string | null;
  note?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  origName?: string | null;
  sizeBytes?: number | null;
  folder?: boolean;
  locked?: boolean;
  unlocked?: boolean;
};

export type DocPerson = { id: string; name: string; department?: string | null };
export type ShareResult = { sent: number; already: number; noChat?: string[] };

// 지금 보고 있는 자리. sharedRootId 는 공유받은 폴더를 열어보는 중일 때 그 폴더 번호 — 이때는 갈래를 따지지 않고 그 아래만 오르내린다
export type DocPlace = { kind: DocKind; currentId: number | null; ownerFilter: string | null; sharedRootId: number | null };

export const folderById = (folders: DocFolder[], id: number | null | undefined) =>
  id == null ? undefined : folders.find((f) => f.id === id);

// 지금 폴더까지 오는 길. 최상위 → … → 지금 폴더. 공유받은 폴더를 보는 중이면 받은 그 폴더에서 멈춘다(그 위는 남의 것이다)
export function docPath(folders: DocFolder[], place: DocPlace): DocFolder[] {
  const path: DocFolder[] = [];
  const seen = new Set<number>();
  let cur = place.currentId;
  while (cur != null && !seen.has(cur)) {
    seen.add(cur);
    const f = folderById(folders, cur);
    if (!f) break;
    path.unshift(f);
    if (place.sharedRootId != null && cur === place.sharedRootId) break;
    cur = f.parentId ?? null;
  }
  return path;
}

// 지금 폴더 바로 아래 폴더들
export function childFolders(folders: DocFolder[], place: DocPlace): DocFolder[] {
  return folders.filter((f) => {
    // 공유받은 폴더 안에서는 갈래를 안 따진다. 받은 폴더가 남의 개인함 것일 수도, 다른 부서 공용함 것일 수도 있다
    if (place.sharedRootId != null) return (f.parentId ?? null) === place.currentId;
    if (f.rootKind !== place.kind) return false;
    if (place.kind === '개인' && place.ownerFilter != null && f.rootOwnerId !== place.ownerFilter) return false;
    return place.currentId == null ? f.parentId == null : f.parentId === place.currentId;
  });
}

// 관리자가 남의 개인문서함을 들여다보는 중이거나 공유받은 폴더를 보는 중 — 꺼내 보는 것과 남의 서랍에 넣는 것은 다른 일이다
export function isPeeking(place: DocPlace, me: DocUser | null): boolean {
  if (place.sharedRootId != null) return true;
  return place.kind === '개인' && Boolean(me?.admin) && place.ownerFilter != null && place.ownerFilter !== me?.id;
}

export function docHint(place: DocPlace, me: DocUser | null): string {
  if (place.sharedRootId != null) return '공유받은 폴더예요. 내려받기만 할 수 있어요.';
  if (isPeeking(place, me)) return '남의 개인문서함을 보는 중이에요. 내려받기만 할 수 있어요.';
  if (place.currentId == null) {
    return place.kind === '공용'
      ? '부서 폴더를 먼저 만들어주세요. 파일은 폴더 안에만 올릴 수 있어요.'
      : '나만 보는 문서함이에요. 폴더를 먼저 만들고 그 안에 올려주세요.';
  }
  return '이 폴더 안에 하위폴더를 더 만들거나, 파일을 올릴 수 있어요.';
}

export function emptyText(place: DocPlace): string {
  if (place.currentId != null) return '이 폴더는 비어있습니다';
  return place.kind === '공용' ? '만들어진 부서 폴더가 없습니다' : '만들어둔 폴더가 없습니다';
}

// 관리자만 쓰는 '누구의 개인문서함' 고르기. 개인문서함을 하나라도 가진 사람만 올리고, 내 것은 '내 문서함'
export function ownerOptions(folders: DocFolder[], me: DocUser | null): { id: string; name: string }[] {
  const owners = new Map<string, string>();
  folders.forEach((f) => {
    if (f.rootKind === '개인' && f.rootOwnerId != null) owners.set(f.rootOwnerId, f.rootOwnerName || `사원 ${f.rootOwnerId}`);
  });
  if (me) owners.set(me.id, '내 문서함');
  return Array.from(owners.entries()).map(([id, name]) => ({ id, name }));
}

// 최상위 공용 폴더에는 어느 부서 것인지를 꼬리표로 붙인다. 부서가 비어있으면 전사 공용이다
export const deptTag = (f: DocFolder) => (f.parentId != null || f.rootKind !== '공용' ? '' : f.department || '전사 공용');

// 잠긴 채로는 안에 몇 개 들었는지 안 보인다
export function folderCounts(f: DocFolder): string {
  if (f.locked && !f.unlocked) return '';
  return `${f.childCount ? ` 폴더 ${f.childCount}` : ''}${f.fileCount ? ` 파일 ${f.fileCount}` : ''}`.trim();
}

export function sizeText(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const dateOnly = (value: string | null | undefined) => (value || '').slice(0, 10);

// 새 폴더 창 제목·안내(최상위 폴더를 만들 때만 '어느 부서 것인지' 를 묻는다)
export function folderDialogTitle(path: DocFolder[], kind: DocKind): string {
  if (path.length === 0) return kind === '공용' ? '새 부서 폴더' : '새 폴더 (나만 봄)';
  return `새 폴더 — ${path[path.length - 1].name} 안에`;
}

export function folderDialogHint(atRoot: boolean, kind: DocKind, me: DocUser | null): string {
  if (!atRoot) return '';
  if (kind === '개인') return '나와 관리자만 볼 수 있어요.';
  if (me?.admin) return '고른 부서 사람만 볼 수 있어요. 전사 공용으로 두면 누구나 봅니다.';
  return `${me?.department || '내 부서'} 사람만 볼 수 있어요.`;
}

// 보낸 결과 문구. 메신저를 못 보는 사람이 있으면 따로 알려달라고 적는다(조용히 넘어가면 상대는 영영 모른다)
export function shareResultText(result: ShareResult): string {
  let text = `${result.sent}명에게 보냈어요`;
  if (result.already) text += ` (이미 보낸 사람 ${result.already}명은 건너뜀)`;
  if (result.noChat && result.noChat.length) text += ` — ${result.noChat.join(', ')}님은 메신저를 안 쓰셔서 알림이 안 갔어요. 따로 알려주세요`;
  return text;
}

export function uploadResultText(saved: number, errors: string[] | undefined): string {
  return `${saved}개 올렸어요${errors && errors.length ? ` (${errors.length}개 실패)` : ''}`;
}

// 잠긴 폴더 안으로 곧장 들어왔을 때(서버 문구)
export const isLockedMessage = (message: string) => message.endsWith('폴더는 비밀번호가 걸려 있어요');
