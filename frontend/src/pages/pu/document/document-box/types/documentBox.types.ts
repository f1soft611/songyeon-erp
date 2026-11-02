// 구매관리 > 문서함 값(송연 28-documents.js)
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

// 표 한 줄: 폴더 또는 파일. 폴더가 위, 파일이 아래(송연과 같음)
export type BoxRow = {
  key: string;
  type: 'folder' | 'file';
  name: string;
  by: string;
  date: string;
  size: string;
  folder?: DocFolder;
  file?: DocFile;
  rowAction?: never; // 표의 단추 칸 자리(값 없음)
};

export type ShareRow = DocShare & {
  key: string;
  rowAction?: never; // 표의 [공유취소] 단추 칸 자리(값 없음)
};

export type ShareTab = 'mine' | 'sent';

// 공유 창에 넘기는 것: 문서 하나 또는 폴더 하나
export type ShareTarget = { attachmentId: number | null; folderId: number | null; name: string };
