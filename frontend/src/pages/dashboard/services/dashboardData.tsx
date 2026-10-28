import type { ReactNode } from 'react';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import SecurityOutlined from '@mui/icons-material/SecurityOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import VpnKeyOutlined from '@mui/icons-material/VpnKeyOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import NotificationsOutlined from '@mui/icons-material/NotificationsOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import type { ModuleItem, PageContent } from '../types/dashboard';
import { moduleDescriptors, type ModuleDescriptor } from './menuService';

function ModuleIcon({ name }: { name: string }): ReactNode {
  const map: Record<string, ReactNode> = {
    Groups: <GroupsOutlined fontSize="medium" />,
    Settings: <SettingsOutlined fontSize="medium" />,
    Dashboard: <DashboardOutlined fontSize="medium" />,
    Folder: <FolderOutlined fontSize="medium" />,
    Assignment: <AssignmentOutlined fontSize="medium" />,
    Business: <BusinessOutlined fontSize="medium" />,
    Security: <SecurityOutlined fontSize="medium" />,
    People: <PeopleOutlined fontSize="medium" />,
    Build: <BuildOutlined fontSize="medium" />,
    VpnKey: <VpnKeyOutlined fontSize="medium" />,
    Inventory: <Inventory2Outlined fontSize="medium" />,
    Notifications: <NotificationsOutlined fontSize="medium" />,
    CalendarMonth: <CalendarMonthOutlined fontSize="medium" />,
    ShoppingCart: <ShoppingCartOutlined fontSize="medium" />,
    AdminPanelSettings: <AdminPanelSettingsOutlined fontSize="medium" />,
    ListAlt: <ListAltOutlined fontSize="medium" />,
    CheckCircle: <CheckCircleOutlined fontSize="medium" />,
    FileText: <DescriptionOutlined fontSize="medium" />,
    ClipboardCheck: <FactCheckOutlined fontSize="medium" />,
  };

  return map[name] ?? map.Settings;
}

export const buildModuleItems = (
  descriptors: ModuleDescriptor[],
): ModuleItem[] =>
  descriptors.map(({ id, name, iconName, path, tree, menus }) => ({
    id,
    name,
    icon: <ModuleIcon name={iconName} />,
    path,
    tree,
    menus,
  }));

export const moduleItems: ModuleItem[] = buildModuleItems(moduleDescriptors);

export const buildPageContent = (
  baseContent: PageContent,
  menu: { name: string; description?: string },
): PageContent => ({
  ...baseContent,
  title: menu.name,
  description: menu.description ?? baseContent.description,
});

export const defaultPage: PageContent = {
  title: '업무 현황',
  description:
    '모듈별 업무를 한눈에 확인하고 필요한 프로세스를 빠르게 진행할 수 있습니다.',
  cards: [
    { label: '진행 중', value: '24' },
    { label: '검토 요청', value: '07' },
    { label: '완료 건수', value: '86' },
    { label: '정기 보고', value: '04' },
  ],
  items: [
    {
      title: '업무 보고서 승인 요청',
      meta: '재무팀 · 10분 전',
      status: '검토중',
    },
    {
      title: '신규 고객 계약서 검토',
      meta: '영업팀 · 25분 전',
      status: '대기',
    },
    {
      title: '월간 생산 계획 공유',
      meta: '생산팀 · 1시간 전',
      status: '진행중',
    },
  ],
};

export const pageContentMap: Record<string, PageContent> = {
  overview: {
    title: '종합현황',
    description:
      '결재, 공지, 일정 등 그룹웨어 업무 지표를 한 화면에서 확인합니다.',
    cards: [
      { label: '미결 결재', value: '18' },
      { label: '오늘 일정', value: '06' },
      { label: '신규 공지', value: '04' },
      { label: '읽지 않은 문서', value: '12' },
    ],
    items: [
      { title: '인사평가 계획안', meta: '인사팀 · 5분 전', status: '검토중' },
      {
        title: '재무 예산 승인서',
        meta: '회계팀 · 1시간 전',
        status: '결재대기',
      },
      { title: '월간 운영 회의 일정', meta: '총무팀 · 어제', status: '알림' },
    ],
  },
  documents: {
    title: '문서관리',
    description: '기안 문서와 사내 자료를 등록하고 이력을 관리합니다.',
    cards: [
      { label: '전체 문서', value: '218' },
      { label: '기안 대기', value: '09' },
      { label: '보관 문서', value: '146' },
      { label: '이번 주 등록', value: '17' },
    ],
    items: [
      {
        title: '업무 협업 가이드 v2',
        meta: '운영팀 · 2시간 전',
        status: '신규',
      },
      { title: '고객 대응 매뉴얼', meta: '고객지원 · 어제', status: '필독' },
      { title: '보안 점검 결과 보고서', meta: 'IT팀 · 3일 전', status: '보관' },
    ],
  },
  read: {
    title: '문서현황',
    description:
      '과거 전자결재 문서를 검색하고 권한에 따라 상세 및 후속 업무를 처리합니다.',
    cards: [],
    items: [],
  },
  notice: {
    title: '공지사항',
    description:
      '최근 공지 내용을 빠르게 확인하고 주요 업무 안내를 확인합니다.',
    cards: [
      { label: '전체 공지', value: '84' },
      { label: '이번 주', value: '12' },
      { label: '중요 공지', value: '06' },
      { label: '첨부 문서', value: '28' },
    ],
    items: [
      {
        title: '2026년 3분기 업무 일정 변경 안내',
        meta: '운영팀 · 2026.09.12 · 조회 142',
        status: '중요 공지',
      },
      {
        title: '시스템 점검으로 인한 일부 서비스 제한 안내',
        meta: 'IT운영 · 2026.09.10 · 조회 88',
        status: '운영',
      },
      {
        title: '보안 교육 참여 안내',
        meta: '인사팀 · 2026.09.08 · 조회 219',
        status: '필독',
      },
    ],
  },
  archive: {
    title: '자료실',
    description: '업무에 필요한 자료를 분류별로 조회하고 첨부파일을 관리합니다.',
    cards: [],
    items: [],
  },
  roles: {
    title: '권한관리',
    description: '역할별 메뉴 접근 권한과 기능 권한을 설정합니다.',
    kind: 'roles',
    cards: [
      { label: '등록 역할', value: '06' },
      { label: '권한 매핑', value: '48' },
      { label: '관리자 계정', value: '03' },
      { label: '검토 대기', value: '01' },
    ],
    items: [
      {
        title: 'ADMIN 역할 권한 점검',
        meta: '운영팀 · 오늘',
        status: '진행중',
      },
      {
        title: '일반사용자 권한 조정',
        meta: '인사팀 · 어제',
        status: '검토중',
      },
      {
        title: '외부협력사 접근 제한',
        meta: '보안팀 · 2일 전',
        status: '완료',
      },
    ],
  },
  menus: {
    title: '메뉴관리',
    description: '모듈별 메뉴 구성과 상위/하위 메뉴 관계를 관리합니다.',
    kind: 'menus',
    cards: [
      { label: '등록 모듈', value: '02' },
      { label: '등록 메뉴', value: '04' },
      { label: '사용 중', value: '04' },
      { label: '미사용', value: '00' },
    ],
    items: [
      { title: '그룹웨어 메뉴 구성', meta: '운영팀 · 오늘', status: '사용' },
      { title: '환경설정 메뉴 구성', meta: '운영팀 · 오늘', status: '사용' },
      { title: '메뉴 정렬 순서 정비', meta: 'IT팀 · 어제', status: '완료' },
    ],
  },
  modules: {
    title: '모듈관리',
    description: '모듈 코드와 루트 경로, 아이콘, 사용 여부를 관리합니다.',
    kind: 'menus',
    cards: [
      { label: '등록 모듈', value: '05' },
      { label: '활성 모듈', value: '04' },
      { label: '미사용', value: '01' },
      { label: '메뉴 수', value: '18' },
    ],
    items: [
      { title: '그룹웨어 모듈 정렬', meta: '운영팀 · 오늘', status: '사용' },
      {
        title: '환경설정 모듈 경로 점검',
        meta: 'IT팀 · 어제',
        status: '검토중',
      },
      { title: '품질관리 모듈 설정', meta: '품질팀 · 2일 전', status: '신규' },
    ],
  },
  'common-code': {
    title: '공통코드 관리',
    description: '공통코드를 그룹과 상세코드로 관리합니다.',
    cards: [
      { label: '그룹 수', value: '08' },
      { label: '상세코드 수', value: '46' },
      { label: '사용 중', value: '39' },
      { label: '미사용', value: '07' },
    ],
    items: [
      {
        title: '첨부문서업무 그룹 정리',
        meta: '운영팀 · 오늘',
        status: '정상',
      },
      {
        title: '거래처 구분 코드 확인',
        meta: '인사팀 · 어제',
        status: '검토중',
      },
      {
        title: '공통코드 정렬 기준 조정',
        meta: 'IT팀 · 2일 전',
        status: '신규',
      },
    ],
  },
  cmncodes: {
    title: '공통코드 관리',
    description: '공통코드를 그룹과 상세코드로 관리합니다.',
    cards: [
      { label: '그룹 수', value: '08' },
      { label: '상세코드 수', value: '46' },
      { label: '사용 중', value: '39' },
      { label: '미사용', value: '07' },
    ],
    items: [
      {
        title: '첨부문서업무 그룹 정리',
        meta: '운영팀 · 오늘',
        status: '정상',
      },
      {
        title: '거래처 구분 코드 확인',
        meta: '인사팀 · 어제',
        status: '검토중',
      },
      {
        title: '공통코드 정렬 기준 조정',
        meta: 'IT팀 · 2일 전',
        status: '신규',
      },
    ],
  },
  'f1-grid-test': {
    title: 'F1 Grid 테스트',
    description: '클립보드, 검증, 확장 에디터와 키보드 입력을 확인합니다.',
    cards: [],
    items: [],
  },
  'f1-grid-docs': {
    title: 'F1-Grid 문서',
    description: 'F1-Grid 사용법과 실행 가능한 예제를 확인합니다.',
    cards: [],
    items: [],
  },
} as const;
