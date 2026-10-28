# 20261016_005 공통관리 > 기준정보(현재 이름 '기초정보') > 공통코드 관리 메뉴 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-16 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-16 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261016_005_rollback.sql` |
| 앞선 작업 | `20261016_003` (분류 코드 `master`) · `20261016_004` (`tb_id_sequence`) |

## 내용

- S_ERP 의 '기준정보 > 기준정보 관리 > 공통코드 관리' 화면을 송연 공통관리의 `master` 분류 아래에 열었다.
  - 분류 이름은 적용 시점에 '기초정보' 였다(2026-10-16 17:24 에 메뉴관리에서 바뀜).
- 추가한 `tb_menu` 한 줄

| 칸 | 값 |
|---|---|
| `menu_code` | `cmncodes` (S_ERP 화면 키와 같다) |
| `menu_nm` | 공통코드 관리 |
| `menu_url` | `/cm/master/cmncodes` (S_ERP `/co/master/cmncodes`) |
| 부모 | `master` |
| `sort_order` | 30 (기초정보 10 · 포장유형 20 다음) |
| `menu_dc` | 비움 (화면 안 설명이 있다) |

- 권한 행: 같은 분류의 기초정보(`settings`)와 똑같이 복사했다.
  - `tb_menu_permission`: 5행
  - `tb_role_menu_permission`: 0행 (기초정보와 같다)

## 영향 범위

- 메뉴판: 분류 아래 기초정보 · 포장유형 · 공통코드 관리
- 공통코드 자료(`tb_common_code_group` · `tb_common_code_item`)와 API(`/api/v1/co/master/common-code`)는 바뀌지 않는다.
- 롤백은 메뉴와 권한 행만 지운다. 공통코드 자료는 건드리지 않는다.

## 확인

- 한 트랜잭션 안에서 다음을 차례로 했다(20261016_004 와 함께).
  1. 적용: 공통코드 관리 #30, 권한 5 · 0
  2. 다시 적용: 같은 결과
  3. 롤백 스크립트: 원래대로
  4. ROLLBACK
- ROLLBACK 후 메뉴 · 권한 세 표 전체가 시험 전과 같았다.
- 그 뒤 004 → 005 순서로 적용했다.
