import { useState } from 'react';
import {
  deleteArchiveAttachment,
  updateArchiveFile,
  uploadArchiveFile,
} from '../services/archiveBoardService';
import type {
  ArchiveFileRow,
  ArchiveFileUpdatePayload,
} from '../types/archive.types';

type UseArchiveMutationsOptions = {
  reloadList: () => Promise<void>;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useArchiveMutations({
  reloadList,
  showError,
  showSuccess,
}: UseArchiveMutationsOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const uploadFiles = async (files: File[], folderCode?: string | null) => {
    if (files.length === 0) return { successCount: 0, failures: [] as string[] };
    setIsUploading(true);
    const failures: string[] = [];
    let successCount = 0;
    try {
      for (const file of files) {
        try {
          await uploadArchiveFile(file, folderCode ?? undefined);
          successCount += 1;
        } catch (error) {
          failures.push(`${file.name}: ${messageOf(error)}`);
        }
      }
      await reloadList();
      if (failures.length > 0) {
        showError(`일부 파일 업로드에 실패했습니다. ${failures.join('; ')}`);
      } else {
        showSuccess('파일을 업로드했습니다.');
      }
      return { successCount, failures };
    } finally {
      setIsUploading(false);
    }
  };

  const updateFile = async (
    row: ArchiveFileRow,
    payload: ArchiveFileUpdatePayload,
  ) => {
    setIsUpdating(true);
    try {
      const updated = await updateArchiveFile(row.boardFileId, payload);
      await reloadList();
      showSuccess('파일 정보를 수정했습니다.');
      return updated;
    } catch (error) {
      showError(`파일 수정에 실패했습니다: ${messageOf(error)}`);
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFile = async (row: ArchiveFileRow) => {
    setIsDeleting(true);
    try {
      await deleteArchiveAttachment(row.boardFileId, row.postId);
      await reloadList();
      showSuccess('파일을 삭제했습니다.');
      return true;
    } catch (error) {
      showError(`파일 삭제에 실패했습니다: ${messageOf(error)}`);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    uploadFiles,
    updateFile,
    deleteFile,
    isUploading,
    isUpdating,
    isDeleting,
  };
}
