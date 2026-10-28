import type { RoleManagementRow } from '../types/roleManagement.types';

export const roleRows: RoleManagementRow[] = [
  {
    id: 'admin',
    name: 'ADMIN',
    description: '시스템 전체 권한을 보유한 최고 관리자 역할',
    group: '운영팀',
    menuCount: 24,
    active: true,
    permissions: { read: true, create: true, update: true, delete: true },
  },
  {
    id: 'manager',
    name: 'MANAGER',
    description: '업무 관리와 승인 권한을 가진 운영 관리자 역할',
    group: '인사팀',
    menuCount: 18,
    active: true,
    permissions: { read: true, create: true, update: true, delete: false },
  },
  {
    id: 'user',
    name: 'USER',
    description: '기본 업무 조회 및 등록 권한을 가진 일반 사용자 역할',
    group: '사용자',
    menuCount: 9,
    active: true,
    permissions: { read: true, create: true, update: false, delete: false },
  },
];
