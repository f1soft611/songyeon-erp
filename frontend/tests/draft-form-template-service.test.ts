import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

import {
  deleteDraftFormTemplateImage,
  fetchDraftFormTemplateImage,
  fetchDraftFormTemplate,
  saveDraftFormTemplate,
  uploadDraftFormTemplateImage,
} from '../src/pages/co/workflow/form/services/draftFormTemplate.service';

describe('draft form template service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads a template from the selected form endpoint', async () => {
    const template = {
      draftingWorkCategoryId: 77,
      cataTypeCode: '007',
      codeName: '정기점검',
      hasDocument: true,
      templateJson: { type: 'doc', content: [] },
      templateHtml: '<p>본문</p>',
    };
    apiMocks.apiGet.mockResolvedValue({ item: template });

    await expect(fetchDraftFormTemplate(77)).resolves.toEqual(template);
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
    );
  });

  it('saves JSON, HTML, and temporary upload references together', async () => {
    const payload = {
      templateJson: { type: 'doc', content: [] },
      templateHtml: '<p>본문</p>',
      embeddedImages: [{ uploadToken: 'token-1', fileName: 'image.png' }],
    };
    apiMocks.apiPut.mockResolvedValue({ item: { draftingWorkCategoryId: 77 } });

    await saveDraftFormTemplate(77, payload);

    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
      payload,
    );
  });

  it('uploads and deletes images only through the drafting form temp endpoints', async () => {
    const file = new File(['image'], 'chart image.png', { type: 'image/png' });
    apiMocks.apiPostFormData.mockResolvedValue({
      item: { uploadToken: 'token-1' },
    });

    await uploadDraftFormTemplateImage(77, file);
    await deleteDraftFormTemplateImage(77, 'token-1', 'chart image.png');

    const formData = apiMocks.apiPostFormData.mock.calls[0][1] as FormData;
    expect(apiMocks.apiPostFormData).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template-images/temp',
      formData,
    );
    expect(formData.get('file')).toBe(file);
    expect(apiMocks.apiDelete).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template-images/temp/token-1?fileName=chart+image.png',
    );
  });

  it('loads stored images through the authenticated form image endpoint', async () => {
    const blob = new Blob(['image']);
    apiMocks.apiGetBlob.mockResolvedValue(blob);

    await expect(fetchDraftFormTemplateImage(77, 901)).resolves.toBe(blob);
    expect(apiMocks.apiGetBlob).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template-images/901',
    );
  });
});
