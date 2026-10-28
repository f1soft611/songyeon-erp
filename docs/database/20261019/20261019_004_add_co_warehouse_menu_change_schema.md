# 20261019_004 공통관리 > 기초정보 > 창고등록(BSWarehouseView) 메뉴 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-19 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261019_004_rollback.sql` |

## 내용

- 요청: "화면 ID BSWarehouseView로 창고등록 화면 만들어줘. 기존의 기초정보에 있던 창고등록 탭도 관련 파일까지 다 지워주고"
- 추가한 `tb_menu` 한 줄

| 칸 | 값 |
|---|---|
| `menu_code` | `BSWarehouseView` (화면ID) |
| `menu_nm` | 창고등록 |
| `menu_url` | `/co/master/BSWarehouseView` |
| 부모 | 분류 `master`(이름 '기초정보') |
| `sort_order` | 40 (기초정보 10 · 포장유형 20 · 공통코드 관리 30 다음) |
| `menu_dc` | 비움 |

- 권한 행: 같은 분류의 기초정보(`settings`)와 똑같이 복사했다(`tb_menu_permission` 5행, 역할 0행).

## 영향 범위

- 메뉴판: 기초정보 ▾ 기초정보 · 포장유형 · 공통코드 관리 · 창고등록
- 창고 자료(`warehouses`)는 바뀌지 않는다. 같은 표를 새 화면 · 새 API(`/api/v1/co/master/warehouse`)가 쓴다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 메뉴 · 권한 세 표 전체가 시험 전과 같았다.
- 그 뒤 적용했다.
