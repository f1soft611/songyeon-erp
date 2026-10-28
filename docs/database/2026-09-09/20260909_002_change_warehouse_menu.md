# 20260909_002 창고관리 메뉴 등록 이력

## 변경 일자

2026-09-09

## 변경 내용

- `T1358606250`(에프원소프트) 테넌트에 `창고관리`(`/settings/system/warehouses`) 메뉴 등록 (`20260909_002_seed_warehouse_menu.sql`)
- 위치: 환경설정 > 시스템 관리(`ST_SYSTEM`) 하위, `sort_order` 4 (`ST_F1_GRID_TEST` 다음)
- 지원 버튼 권한(`tb_menu_permission`): READ / CREATE / UPDATE / DELETE / EXCEL
- 역할 부여(`tb_role_menu_permission`): `PLATFORM_ADMIN` → READ / CREATE / UPDATE / DELETE / EXCEL

## 적용 대상 테이블

- `tb_menu` (row 1건 추가: `ST_WAREHOUSE`)
- `tb_menu_permission` (row 5건 추가)
- `tb_role_menu_permission` (row 5건 추가)

## 영향 범위

- FE: `/settings/system/warehouses` → `frontend/src/pages/dashboard/components/DashboardContent.tsx` 의 게이트 `selectedModule.id === 'settings' && currentPageKey === 'warehouses'` 로 라우팅. `PLATFORM_ADMIN` 역할 사용자 사이드바 "환경설정 > 시스템 관리" 아래에 노출.
- 스키마 변경 없음 (seed only). 기존 메뉴/권한 row 무변경.
- 모든 INSERT 는 `tenant_code` 로 스코프 + `ON CONFLICT DO NOTHING` → 재실행 안전.

## 롤백 여부

- 가능. `20260909_002_rollback.sql` — `tb_menu` 의 `ST_WAREHOUSE` 한 줄 삭제 시 FK `ON DELETE CASCADE` 로 `tb_menu_permission` / `tb_role_menu_permission` 매핑 동반 삭제.

## 관련 문서

- DB 스키마: `20260909_001_create_warehouse_schema.sql` (`tb_warehouse` 테이블), `docs/database/db-schema.md` §2-14
- 백엔드 API: `/api/v1/system/warehouses` (+`/{id}`) — `egovframework.let.system.warehouses`
- 프론트 소스 set: `frontend/src/pages/settings/system/warehouses/`
