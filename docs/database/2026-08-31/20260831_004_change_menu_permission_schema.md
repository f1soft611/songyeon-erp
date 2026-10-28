# 20260831_004 메뉴/권한 스키마 변경 이력

## 변경 일자

2026-08-31

## 변경 내용

- 메뉴별 제공 버튼/기능 권한 마스터인 `tb_permission` 테이블을 신규 생성한다.
- 메뉴별 허용 가능한 기본 권한 집합을 저장하는 `tb_menu_permission` 매핑 테이블을 신규 생성한다.
- 역할(Role) 관점에서 실제 메뉴 활성화 여부와 기본 버튼 권한을 저장하는 `tb_role_menu_permission`은 별도 역할별 매핑 테이블로 유지한다.
- 활성 권한 코드 `READ`, `CREATE`, `UPDATE`, `DELETE`, `EXCEL`을 초기 데이터로 등록하거나 갱신한다.

## 적용 대상 테이블

- `tb_permission` (신규)
- `tb_menu_permission` (신규)
- `tb_role_menu_permission` (기존 역할별 매핑 테이블, 메뉴 관리/권한 설정 저장소로 사용)

## 영향 범위

- 메뉴 관리 API는 `tb_permission` 및 `tb_menu_permission`을 기준으로 기본 기능 권한 마스터와 허용 가능한 권한 목록을 조회한다.
- 역할(Role) 선택 상태에서 저장하는 실제 권한 반영은 `tb_role_menu_permission`에 `role_id + menu_id + permission_id` 형태로 기록한다.
- `tb_menu_permission.menu_id`는 메뉴 삭제 시 매핑이 같이 정리되도록 `tb_menu(menu_id)`를 `ON DELETE CASCADE`로 참조한다.
- `tb_role_menu_permission`은 별도 `role_id` 기준의 실사용 권한 저장소이며, 메뉴 기본 권한 마스터와는 구분하여 관리한다.

## 저장 구조 정리

- `tb_permission`: 전역 권한 코드(READ, CREATE, UPDATE, DELETE, EXCEL 등) 정의
- `tb_menu_permission`: 특정 메뉴가 지원할 수 있는 기본 기능 권한 목록
- `tb_role_menu_permission`: 선택된 역할이 실제로 활성화/허용한 메뉴-권한 매핑

## 롤백 여부

- 가능. `20260831_004_rollback.sql`은 `tb_menu_permission` 및 `tb_role_menu_permission`의 역할별 매핑을 정리한 뒤 `tb_permission`을 제거한다.
- 롤백 시 `tb_menu_permission`에서 삭제된 기본 허용 목록과 `tb_role_menu_permission`에서 삭제된 역할별 선택권한을 함께 고려해야 한다.
