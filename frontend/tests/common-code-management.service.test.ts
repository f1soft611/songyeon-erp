import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as apiClient from '../src/shared/services/apiClient';
import {
  fetchCommonCodeGroups,
  fetchCommonCodeItems,
  type CommonCodeGroupSearchFilters,
} from '../src/pages/co/master/common-code/services/commonCodeManagement.service';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('commonCodeManagement.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads groups from the co/master/common-code API', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({
      resultList: [
        {
          commonCodeGroupId: 1,
          tenantId: 1,
          groupCode: 'ATTACH_DOC',
          groupNm: '첨부문서업무',
          groupDc: '첨부문서 업무',
          parentGroupId: null,
          sortOrder: 1,
          useAt: 'Y',
        },
      ],
    });

    await expect(fetchCommonCodeGroups()).resolves.toMatchObject([
      { id: '1', groupCode: 'ATTACH_DOC', groupNm: '첨부문서업무' },
    ]);
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/common-code/groups',
    );
  });

  it('adds only populated group search filters to the groups request', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({ resultList: [] });

    const filters: CommonCodeGroupSearchFilters = {
      keyword: '공통 코드',
      groupCode: 'DOC',
      groupNm: '',
      groupDc: undefined,
    };

    await fetchCommonCodeGroups(filters);

    expect(apiClient.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/common-code/groups?keyword=%EA%B3%B5%ED%86%B5+%EC%BD%94%EB%93%9C&groupCode=DOC',
    );
  });

  it('loads item rows for the selected group', async () => {
    vi.mocked(apiClient.apiGet).mockResolvedValue({
      resultList: [
        {
          commonCodeItemId: 10,
          tenantId: 1,
          groupId: 2,
          itemCode: 'STATEMENT',
          itemNm: '거래명세서',
          parentItemId: null,
          parentItemNm: '',
          itemDc: '거래 명세서',
          sortOrder: 1,
          useAt: 'Y',
        },
      ],
    });

    await expect(fetchCommonCodeItems('2')).resolves.toMatchObject([
      { id: '10', itemCode: 'STATEMENT', itemNm: '거래명세서' },
    ]);
    expect(apiClient.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/common-code/groups/2/items',
    );
  });
});
