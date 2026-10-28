# 20260831_005 역할별 메뉴 권한 매핑 스키마 이력

## 변경 일자

2026-08-31

## 변경 내용

- 역할(Role) 기준 메뉴 활성화 여부와 기본 기능 권한을 저장하는 `tb_role_menu_permission` 생성 스크립트를 추가한다.
- 기존 `tb_permission` / `tb_menu_permission` 구조와 별개로, 선택된 역할이 실제로 허용한 메뉴-권한 조합을 저장하는 실사용 테이블로 관리한다.
- `tb_role_menu_permission`은 `role_id`, `menu_id`, `permission_id` 3중 조합으로 역할별 권한 매핑을 저장한다.

## 적용 대상 테이블

- `tb_role_menu_permission` (신규)

## 영향 범위

- `GET /api/v1/system/menus?moduleId={moduleId}&roleId={roleId}` 조회 시 해당 역할의 메뉴 및 버튼 권한을 읽어온다.
- `PUT /api/v1/system/roles/{roleId}/menu-permissions` 저장 시 `tb_role_menu_permission`에 `INSERT / DELETE`를 수행한다.
- 대시보드 좌측 메뉴 트리와 페이지 헤더 우측 액션 버튼은 이 테이블 기준으로 권한 계산을 수행한다.

## 저장 구조

- `tb_role_menu_permission` : `role_id + menu_id + permission_id` 조합으로 역할별 메뉴 접근 및 기능 권한을 저장
- 각 `permission_id`는 `tb_permission` 참조
- 각 `menu_id`는 `tb_menu` 참조
- 각 `role_id`는 `tb_role` 참조

## 롤백 여부

- 가능. `20260831_005_rollback.sql`을 실행하면 `tb_role_menu_permission`만 제거한다.
- `tb_permission` 및 `tb_menu_permission` 자체는 삭제하지 않고, 역할별 매핑만 정리한다.
