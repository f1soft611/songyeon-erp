import { act, renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRichTextEditorSaveLifecycle } from '../src/shared/components/rich-text-editor/useRichTextEditorSaveLifecycle';

const { apiGetBlob } = vi.hoisted(() => ({ apiGetBlob: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => ({ apiGetBlob }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  apiGetBlob.mockReset();
});

type TestImageNode = {
  type: { name: string };
  attrs: Record<string, unknown>;
};

function createEditor(imageNodes: TestImageNode[]) {
  return {
    getHTML: vi.fn(() => '<p>본문</p>'),
    getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
    state: {
      doc: {
        descendants: (visit: (node: TestImageNode) => void) => {
          imageNodes.forEach(visit);
        },
      },
    },
  } as unknown as Editor;
}

describe('useRichTextEditorSaveLifecycle', () => {
  const previewPath = '/api/v1/common/embedded-images/temp/bde1fdec-5d22-487a-a254-2b9547cd32b3?fileName=pasted.png';
  const temporaryImage = { uploadToken: 'image-token', fileName: 'pasted.png' };

  function renderProxyUpload() {
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const hook = renderHook(() => useRichTextEditorSaveLifecycle({
      editor: createEditor([]),
      uploadImage: async () => ({ ...temporaryImage, src: previewPath }),
      deleteTemporaryImage,
    }));
    return { ...hook, deleteTemporaryImage };
  }

  function stubObjectUrls() {
    const createObjectURL = vi.fn(() => 'blob:authenticated-preview');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    return { createObjectURL, revokeObjectURL };
  }

  it('loads the backend preview with authentication and preserves promotion metadata', async () => {
    const blob = new Blob(['image'], { type: 'image/png' });
    apiGetBlob.mockResolvedValue(blob);
    const { createObjectURL } = stubObjectUrls();
    const { result } = renderProxyUpload();

    const uploaded = await result.current.uploadImage(new File(['x'], 'pasted.png'));

    expect(apiGetBlob).toHaveBeenCalledWith(previewPath);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(uploaded).toEqual({ ...temporaryImage, src: 'blob:authenticated-preview' });
    expect(result.current.getSnapshot().temporaryImages).toEqual([temporaryImage]);
  });

  it.each(['orphan', 'cancel', 'save', 'unmount'] as const)(
    'releases its authenticated preview URL on %s',
    async (operation) => {
      apiGetBlob.mockResolvedValue(new Blob(['image']));
      const { revokeObjectURL } = stubObjectUrls();
      const { result, unmount } = renderProxyUpload();
      const uploaded = await result.current.uploadImage(new File(['x'], 'pasted.png'));

      if (operation === 'orphan') await result.current.onOrphanedImageUpload(uploaded);
      if (operation === 'cancel') await result.current.cleanupTemporaryImages();
      if (operation === 'save') result.current.completeSave();
      if (operation === 'unmount') unmount();

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-preview');
    },
  );

  it('cleans the temporary object when the preview cannot be read', async () => {
    apiGetBlob.mockRejectedValue(new Error('preview unavailable'));
    const { result, deleteTemporaryImage } = renderProxyUpload();

    await expect(result.current.uploadImage(new File(['x'], 'pasted.png')))
      .rejects.toThrow('preview unavailable');

    expect(deleteTemporaryImage).toHaveBeenCalledWith(temporaryImage);
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
  });

  it('keeps a saved draft preview visible until the still-open composer is closed', async () => {
    apiGetBlob.mockResolvedValue(new Blob(['image']));
    const { revokeObjectURL } = stubObjectUrls();
    const { result, deleteTemporaryImage } = renderProxyUpload();
    await result.current.uploadImage(new File(['x'], 'pasted.png'));

    result.current.completeSave({ keepPreviews: true });

    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await result.current.cleanupTemporaryImages();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-preview');
    expect(deleteTemporaryImage).not.toHaveBeenCalled();
  });

  it('does not retain a preview that finishes loading after unmount', async () => {
    let resolvePreview!: (blob: Blob) => void;
    apiGetBlob.mockReturnValue(new Promise<Blob>((resolve) => { resolvePreview = resolve; }));
    const { revokeObjectURL } = stubObjectUrls();
    const { result, unmount } = renderProxyUpload();
    const pending = result.current.uploadImage(new File(['x'], 'pasted.png'));
    await vi.waitFor(() => expect(apiGetBlob).toHaveBeenCalledWith(previewPath));
    unmount();
    resolvePreview(new Blob(['image']));
    await pending.catch(() => undefined);

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:authenticated-preview');
  });

  it('does not forward authorization to an external upload preview', async () => {
    const externalImage = {
      ...temporaryImage,
      src: 'https://storage.example.com/api/v1/common/embedded-images/temp/image-token',
    };
    const { result } = renderHook(() => useRichTextEditorSaveLifecycle({
      editor: createEditor([]),
      uploadImage: async () => externalImage,
      deleteTemporaryImage: vi.fn(),
    }));

    expect(await result.current.uploadImage(new File(['x'], 'pasted.png'))).toEqual(externalImage);
    expect(apiGetBlob).not.toHaveBeenCalled();
  });

  it('keeps failed preview cleanup available for a later cancel retry', async () => {
    apiGetBlob.mockRejectedValue(new Error('preview unavailable'));
    const { result, deleteTemporaryImage } = renderProxyUpload();
    deleteTemporaryImage.mockRejectedValueOnce(new Error('delete unavailable'));

    await expect(result.current.uploadImage(new File(['x'], 'pasted.png'))).rejects.toThrow('preview unavailable');
    expect(result.current.getSnapshot().temporaryImages).toEqual([temporaryImage]);

    await result.current.cleanupTemporaryImages();
    expect(deleteTemporaryImage).toHaveBeenCalledTimes(2);
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
  });

  it('separates current image references from the complete temporary upload session', async () => {
    const imageNodes: TestImageNode[] = [];
    const editor = createEditor(imageNodes);
    const uploadImage = vi.fn(async (file: File) => ({
      src: `preview:${file.name}`,
      alt: file.name,
      uploadToken: `token-${file.name}`,
    }));
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useRichTextEditorSaveLifecycle({
        editor,
        uploadImage,
        deleteTemporaryImage,
      }),
    );

    await act(async () => {
      await result.current.uploadImage(new File(['a'], 'used.png'));
      await result.current.uploadImage(new File(['b'], 'removed.png'));
    });
    imageNodes.push({
      type: { name: 'image' },
      attrs: {
        src: 'preview:used.png',
        alt: 'used.png',
        'data-upload-token': 'token-used.png',
      },
    });

    const snapshot = result.current.getSnapshot();

    expect(snapshot.html).toBe('<p>본문</p>');
    expect(snapshot.json).toEqual({ type: 'doc', content: [] });
    expect(snapshot.referencedImages).toEqual([
      expect.objectContaining({
        uploadToken: 'token-used.png',
        fileName: 'used.png',
      }),
    ]);
    expect(snapshot.temporaryImages).toEqual([
      { uploadToken: 'token-used.png', fileName: 'used.png' },
      { uploadToken: 'token-removed.png', fileName: 'removed.png' },
    ]);
  });

  it('deletes orphaned uploads and removes them from the session', async () => {
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useRichTextEditorSaveLifecycle({
        editor: createEditor([]),
        uploadImage: vi.fn(async (file: File) => ({
          src: `preview:${file.name}`,
          alt: file.name,
          uploadToken: 'orphan-token',
        })),
        deleteTemporaryImage,
      }),
    );

    await act(async () => {
      await result.current.uploadImage(new File(['x'], 'orphan.png'));
      await result.current.onOrphanedImageUpload({
        uploadToken: 'orphan-token',
        alt: 'orphan.png',
      });
    });

    expect(deleteTemporaryImage).toHaveBeenCalledWith({
      uploadToken: 'orphan-token',
      fileName: 'orphan.png',
    });
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
  });

  it('cleans all pending uploads on cancel and clears them after successful save without deleting again', async () => {
    const deleteTemporaryImage = vi.fn(async () => undefined);
    const uploadImage = vi.fn(async (file: File) => ({
      src: `preview:${file.name}`,
      alt: file.name,
      uploadToken: `token-${file.name}`,
    }));
    const { result } = renderHook(() =>
      useRichTextEditorSaveLifecycle({
        editor: createEditor([]),
        uploadImage,
        deleteTemporaryImage,
      }),
    );

    await act(async () => {
      await result.current.uploadImage(new File(['a'], 'first.png'));
      await result.current.uploadImage(new File(['b'], 'second.png'));
      await result.current.cleanupTemporaryImages();
    });

    expect(deleteTemporaryImage).toHaveBeenCalledTimes(2);
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);

    await act(async () => {
      await result.current.uploadImage(new File(['c'], 'saved.png'));
      result.current.completeSave();
    });

    expect(deleteTemporaryImage).toHaveBeenCalledTimes(2);
    expect(result.current.getSnapshot().temporaryImages).toEqual([]);
  });
});
