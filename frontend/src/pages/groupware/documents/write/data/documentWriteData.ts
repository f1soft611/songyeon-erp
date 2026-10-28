import type {
  DocumentKind,
  DocumentWriteItem,
} from '../types/documentWrite.types';

export const documentKinds: DocumentKind[] = [
  '기안서',
  '업무연락',
  '지출결의서',
  '근태신청',
];

export const sampleDocuments: DocumentWriteItem[] = [
  {
    id: 1,
    title: '월간 업무 계획 승인 요청',
    kind: '기안서',
    status: '결재진행중',
    author: '김민수',
    date: '2026.10.02',
    summary: '10월 업무 계획 검토 및 승인을 요청합니다.',
    isPinned: true,
  },
  {
    id: 2,
    title: '생산 일정 변경 안내',
    kind: '업무연락',
    status: '결재진행중',
    author: '김민수',
    date: '2026.10.01',
    summary: '생산 일정 변경 내용을 공유합니다.',
    isPinned: true,
  },
  {
    id: 3,
    title: '작업 장비 교체 검토',
    kind: '기안서',
    status: '임시저장',
    author: '김민수',
    date: '2026.09.30',
    summary: '작업 장비 교체 필요 사항을 정리했습니다.',
  },
  {
    id: 4,
    title: '현장 점검 결과 공유',
    kind: '업무연락',
    status: '보완요청',
    author: '김민수',
    date: '2026.09.29',
    summary: '현장 점검 결과와 조치 사항을 공유합니다.',
  },
  {
    id: 5,
    title: '교육 참석 신청',
    kind: '근태신청',
    status: '승인',
    author: '박서연',
    date: '2026.09.28',
    summary: '외부 교육 참석을 신청했습니다.',
  },
  {
    id: 6,
    title: '현장 소모품 구입 정산',
    kind: '지출결의서',
    status: '결재진행중',
    author: '이도윤',
    date: '2026.09.26',
    summary: '현장 소모품 구입 비용 정산을 요청했습니다.',
  },
  {
    id: 7,
    title: '품질 점검 계획 승인 요청',
    kind: '기안서',
    status: '결재진행중',
    author: '박서연',
    date: '2026.09.25',
    summary: '다음 주 품질 점검 계획 검토를 요청합니다.',
  },
];
