export type ArchiveId = number | string;

export type ArchiveFileType =
  | 'ALL'
  | 'DOCUMENT'
  | 'SPREADSHEET'
  | 'PRESENTATION'
  | 'PDF'
  | 'IMAGE'
  | 'VIDEO'
  | 'ARCHIVE';

export type ArchiveFileSearchFilters = {
  keyword: string;
  folderCode: string;
  uploadedFrom: string;
  uploadedTo: string;
  fileType: ArchiveFileType;
};

export type ArchiveFileRow = {
  boardFileId: ArchiveId;
  postId: ArchiveId;
  fileName: string;
  fileSize?: number | string | null;
  mimeType?: string | null;
  uploadedAt?: string | Date | null;
  writerName?: string | null;
  categoryCode?: string | null;
};

export type ArchiveFileUpdatePayload = {
  postId: ArchiveId;
  fileName: string;
  folderCode?: string | null;
};

export type ArchivePageResult = {
  resultList: ArchiveFileRow[];
  resultCnt: number;
};

export type ArchiveCategory = {
  code: string;
  name: string;
  active: boolean;
};

type ArchiveBrowserRowBase = {
  rowKey: string;
  parentId: string | null;
  name: string;
  ownerName?: string | null;
  uploadedAt?: string | Date | null;
  fileSize?: number | string | null;
  mimeType?: string | null;
  folderCode?: string;
  folderName?: string;
  label?: string;
  file?: ArchiveFileRow;
  active?: boolean;
};

export type ArchiveBrowserRow =
  | (ArchiveBrowserRowBase & {
      rowType: 'section';
      label: string;
    })
  | (ArchiveBrowserRowBase & {
      rowType: 'folder';
      folderCode: string;
      folderName: string;
      active: boolean;
    })
  | (ArchiveBrowserRowBase & {
      rowType: 'file';
      file: ArchiveFileRow;
      active: boolean;
    });

// Legacy compatibility types kept temporarily for incremental migration.
export type ArchiveAttachment = {
  boardFileId: ArchiveId;
  postId: ArchiveId;
  fileName: string;
  fileSize?: number | string | null;
  contentType?: string | null;
  mimeType?: string | null;
  fileUsageType?: string | null;
};

export type ArchivePost = {
  postId: ArchiveId;
  title: string;
  contents: string;
  contentsText: string;
  categoryCode: string;
  attachmentCount: number;
  writerId?: string | null;
  writerName?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  attachments?: ArchiveAttachment[];
};

export type ArchivePostSavePayload = {
  title: string;
  contents: string;
  categoryCode: string;
};
