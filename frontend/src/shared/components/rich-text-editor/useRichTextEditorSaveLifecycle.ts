import { useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import type { RichTextEditorImage } from './richTextEditor.types';

export type TemporaryRichTextImage = {
  uploadToken: string;
  fileName: string;
};

export type ReferencedRichTextImage = RichTextEditorImage & {
  uploadToken: string;
  fileName: string;
  width?: number | string | null;
};

export type RichTextEditorSaveSnapshot = {
  html: string;
  json: JSONContent;
  referencedImages: ReferencedRichTextImage[];
  temporaryImages: TemporaryRichTextImage[];
};

type UploadedRichTextImage = RichTextEditorImage & {
  fileName?: string | null;
};

type UseRichTextEditorSaveLifecycleOptions = {
  editor: Editor | null;
  uploadImage: (file: File) => Promise<UploadedRichTextImage>;
  deleteTemporaryImage: (image: TemporaryRichTextImage) => Promise<void>;
  onImageUploadError?: (message: string) => void;
};

export function useRichTextEditorSaveLifecycle({
  editor,
  uploadImage,
  deleteTemporaryImage,
  onImageUploadError,
}: UseRichTextEditorSaveLifecycleOptions) {
  const temporaryImages = useRef(new Map<string, TemporaryRichTextImage>());
  const [uploadingCount, setUploadingCount] = useState(0);

  const uploadImageWithSession = async (file: File) => {
    const uploaded = await uploadImage(file);
    const fileName =
      uploaded.fileName?.trim() || uploaded.alt?.trim() || file.name;
    if (uploaded.uploadToken && fileName) {
      temporaryImages.current.set(uploaded.uploadToken, {
        uploadToken: uploaded.uploadToken,
        fileName,
      });
    }
    return uploaded;
  };

  const deleteOrphanedImage = async (image: RichTextEditorImage) => {
    if (!image.uploadToken) return;
    const temporaryImage = temporaryImages.current.get(image.uploadToken);
    const fileName = temporaryImage?.fileName || image.alt?.trim();
    if (!fileName) return;
    const upload = { uploadToken: image.uploadToken, fileName };
    await deleteTemporaryImage(upload);
    temporaryImages.current.delete(image.uploadToken);
  };

  const cleanupTemporaryImages = async () => {
    const uploads = Array.from(temporaryImages.current.values());
    await Promise.allSettled(uploads.map(deleteTemporaryImage));
    temporaryImages.current.clear();
  };

  const getSnapshot = (): RichTextEditorSaveSnapshot => {
    const referencedImages: ReferencedRichTextImage[] = [];
    editor?.state.doc.descendants((node) => {
      if (node.type.name !== 'image') return true;
      const uploadToken = node.attrs['data-upload-token'];
      if (typeof uploadToken !== 'string' || !uploadToken.trim()) return true;
      const fileName = String(node.attrs.alt ?? 'pasted-image');
      referencedImages.push({
        src: String(node.attrs.src ?? ''),
        alt: fileName,
        fileName,
        uploadToken,
        fileId: node.attrs['data-file-id'] ?? null,
        objectKey: node.attrs['data-object-key'] ?? null,
        fileSize: Number(node.attrs['data-file-size'] ?? 0) || 0,
        mimeType: String(node.attrs['data-mime-type'] ?? ''),
        width: node.attrs.width ?? null,
      });
      return true;
    });

    return {
      html: editor?.getHTML() ?? '<p></p>',
      json: editor?.getJSON() ?? { type: 'doc', content: [] },
      referencedImages,
      temporaryImages: Array.from(temporaryImages.current.values()),
    };
  };

  return {
    uploadImage: uploadImageWithSession,
    onOrphanedImageUpload: deleteOrphanedImage,
    onUploadingChange: setUploadingCount,
    onImageUploadError,
    uploadingCount,
    getSnapshot,
    cleanupTemporaryImages,
    completeSave: () => temporaryImages.current.clear(),
  };
}
