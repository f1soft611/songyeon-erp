# 20261016_007 공통코드 그룹 '포장방법'(PACKING_TYPE) 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-16 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_common_code_group` (SONGYEON 테넌트) |
| 적용 | 2026-10-16 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261016_007_rollback.sql` |

## 내용

- 요청: "공통코드에 포장방법 이라는 코드 하나 만들어줘 그룹명은 포장방법 그룹코드는 PACKING_TYPE"
- 추가한 그룹 한 줄

| 칸 | 값 |
|---|---|
| `group_code` | `PACKING_TYPE` |
| `group_nm` | 포장방법 |
| `group_dc` | 비움 |
| `parent_group_id` | 비움 (맨 위 그룹) |
| `sort_order` | 1 |
| `use_at` | Y |
| `created_by` · `updated_by` | 비움 |

- 값은 공통코드 관리 화면이 새 그룹을 저장할 때(`CommonCodeGroupDAO.insertGroup`)와 같게 두었다.
- 상세코드는 넣지 않았다. 공통코드 관리 화면에서 넣는다. 상세코드를 비워 저장하면 001 부터 자동 번호가 매겨진다.
- 같은 코드가 이미 있으면 넣지 않는다. 적용 전 확인: 0건

## 영향 범위

- 공통코드 관리 화면 그룹 목록에 '포장방법' 이 보인다.
- 기초정보의 '포장방법' 탭(`packing_methods` 표)과는 별개다. 그 탭은 이 공통코드를 쓰지 않는다.

## 롤백

- 상세코드나 자식 그룹이 없을 때만 그룹을 지운다. 화면에서 넣은 자료를 잃지 않게 하기 위해서다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 `tb_common_code_group` · 상세 건수가 시험 전과 같았다.
- 그룹 ID 번호표(sequence)는 시험 때 하나 넘어갔다. PostgreSQL 번호표는 ROLLBACK 해도 되돌아가지 않는다. 자료에는 영향이 없다.
- 적용 후
  - API `GET /api/v1/co/master/common-code/groups` 에 `PACKING_TYPE` / 포장방법 1건이 나온다.
  - 화면 그룹 목록에도 보인다(조회만).
