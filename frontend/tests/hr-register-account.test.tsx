import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createEmployee = vi.fn();
vi.mock('../src/pages/ha/hr/services/hr.service', () => ({
  createEmployee: (...args: unknown[]) => createEmployee(...args),
  createLeave: vi.fn(),
  updateEmployee: vi.fn(),
}));

import { HrStaffDialog } from '../src/pages/ha/hr/components/HrDialogs';
import type { HrEmployee } from '../src/pages/ha/hr/utils/hr';

beforeEach(() => {
  createEmployee.mockReset();
});

describe('사원 등록 때 로그인 계정도 함께 (2026-10-21)', () => {
  it('새로 등록하는 창에는 사번 · changeme 안내가 있고, 서버 문구(같은 이름)를 창에 보인다', async () => {
    createEmployee.mockRejectedValueOnce(new Error('같은 이름의 사원이 이미 있어요. 이름 뒤에 구분을 붙여 주세요(예: 김민수B)'));
    render(<HrStaffDialog target={{ employee: null }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/등록하면 로그인 계정이 함께 만들어져요/)).toHaveTextContent('changeme');
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '김민수' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));
    expect(await screen.findByText(/같은 이름의 사원이 이미 있어요/)).toBeInTheDocument();
    expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({ name: '김민수' }));
  });

  it('고치는 창에는 안내가 없다', () => {
    const employee: HrEmployee = { id: '00000001', name: '김민수', hasLogin: true, hasResidentNo: false };
    render(<HrStaffDialog target={{ employee }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByText(/등록하면 로그인 계정이 함께 만들어져요/)).not.toBeInTheDocument();
  });
});
