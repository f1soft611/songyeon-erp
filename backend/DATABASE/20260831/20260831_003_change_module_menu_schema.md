# 20260831_003 모듈/메뉴 스키마 변경 이력

## 변경 일자

2026-08-31

## 변경 내용

- `tb_module`, `tb_menu` 테이블 신규 생성 (`20260831_003_create_module_menu_schema.sql`)
- 에프원소프트(T1358606250) 테넌트에 그룹웨어/환경설정 모듈 및 하위 메뉴 시드 데이터 등록 (`20260831_004_seed_module_menu.sql`)

## 적용 대상 테이블

- `tb_module` (신규)
- `tb_menu` (신규)

## 영향 범위

- 모듈/메뉴/권한관리 백엔드 API(`egovframework.let.system.modules`, `egovframework.let.system.menus`) 및 대시보드 좌측 메뉴(`/api/v1/menus/my`)가 이 테이블을 참조한다.
- 기존 `tb_tenant`, `tb_role`에는 컬럼 변경이 없다.

## 롤백 여부

- 가능. `20260831_003_rollback.sql` 실행 시 시드 데이터 삭제 후 두 테이블을 DROP 한다.

## 관련 문서

- 작업지시서: [docs/directions/20260831/20260831*002*모듈*메뉴*권한관리*백엔드*연동\_작업지시서.md](../../../docs/directions/20260831/20260831_002_모듈_메뉴_권한관리_백엔드_연동_작업지시서.md)
