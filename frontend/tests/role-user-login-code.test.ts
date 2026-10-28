import { describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

import { fetchRoleUserRows } from '../src/pages/settings/system/roles/services/roleManagement.service';

describe('권한관리 사용자 매핑: 송연 사원 계정 (2026-10-21)', () => {
  it('줄 키 · 저장 값은 계정 번호(loginId), 보이는 로그인 ID 는 사번(loginCode)', async () => {
    apiGet.mockResolvedValueOnce({
      assignedUsers: [{ loginId: 1, userId: 1, loginCode: '0000', userNm: '관리자', departmentNm: '관리부', lastLoginAt: null }],
      unassignedUsers: [{ loginId: 2, userId: 2, userNm: '나', departmentNm: '-' }],
    });
    const result = await fetchRoleUserRows('6');
    expect(apiGet).toHaveBeenCalledWith('/api/v1/system/roles/6/users');
    expect(result.assignedUsers[0]).toMatchObject({ id: '1', loginId: '1', loginCode: '0000', userNm: '관리자', lastLoginAt: '-' });
    // 사번이 없으면 계정 번호를 보여 준다(화면 칸: loginCode || loginId)
    expect(result.unassignedUsers[0]).toMatchObject({ id: '2', loginId: '2', loginCode: '' });
  });
});
