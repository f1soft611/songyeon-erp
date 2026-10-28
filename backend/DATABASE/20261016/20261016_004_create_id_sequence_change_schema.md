# 20261016_004 조건형 ID 발번 테이블(tb_id_sequence) 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-16 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 스키마 변경 (새 테이블) + 카운터 초기값 |
| 대상 표 | `tb_id_sequence` (새로 만듦), `tb_common_code_item` (읽기만) |
| 적용 | 2026-10-16 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261016_004_rollback.sql` (`DROP TABLE IF EXISTS public.tb_id_sequence`) |
| 출처 | S_ERP `backend/DATABASE/20261002/20261002_003_create_id_sequence_schema.sql` 과 같은 SQL (S_ERP 는 읽기만 했다) |

## 내용

- 공통코드 관리를 S_ERP 최신판으로 맞췄다. 최신판은 상세코드를 비워 두고 저장하면 그룹별로 다음 번호를 자동으로 매긴다(3자리 이상, 예: 001).
  - 이 번호를 내주는 카운터 표 `tb_id_sequence` 를 추가했다.
  - 칸: `generator_key` · `scope_key_1` · `scope_key_2` (PK), `last_issued_value` (0 이상), `created_at` · `updated_at`
- 기존 숫자형 상세코드가 있으면 그룹별 최댓값을 카운터 시작값으로 넣는다. 다음 번호가 겹치지 않게 하기 위해서다.
  - 송연은 지금 공통코드 자료가 0건이라 넣은 행이 없다.
- 카운터 표에는 `tenant_id` 를 두지 않는다(S_ERP 와 같다). 그룹 ID 를 범위 키로 쓴다.

## 영향 범위

- 공통코드 관리 상세코드 저장
  - 코드가 비어 있으면 자동 번호를 매긴다.
  - 코드를 직접 적으면 지금처럼 그대로 쓴다.
- 다른 표 · 화면에는 영향 없음

## 확인

- 한 트랜잭션 안에서 다음을 차례로 했다(20261016_005 와 함께).
  1. 적용: 표가 생기고 칸 6개, 행 0
  2. 다시 적용: 같은 결과(`IF NOT EXISTS` · `ON CONFLICT`)
  3. 롤백 스크립트: 표가 없어짐
  4. ROLLBACK
- ROLLBACK 후 DB 가 시험 전과 같았다.
- 적용 후 번호표 SQL(`IdSequenceDAO.nextValue`)을 다시 트랜잭션 안에서 세 번 불렀다. 1 → 2 → 3 이 나왔고, ROLLBACK 뒤 남은 행은 0이었다.
