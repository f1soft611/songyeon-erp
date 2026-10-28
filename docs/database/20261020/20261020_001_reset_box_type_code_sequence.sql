-- 20261020_001_reset_box_type_code_sequence.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 포장유형 자동 코드(PACK-001 …)가 1번부터 다시 나오게 번호표(tb_id_sequence 키 BOX_TYPE_CODE · F001 · P001)를 0으로 돌린다.
--   - 2026-10-20 요청: "PACK-001 로 시작할 수 있게 해주고"
--   - 서버는 자동 번호를 뽑을 때 이미 있는 코드(사용안함 줄 포함)를 건너뛴다. 그래서 PACK-001 이 표에 남아 있으면 PACK-002 부터 나온다.
-- 다시 돌려도 결과가 같다.

BEGIN;

UPDATE tb_id_sequence
SET last_issued_value = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE generator_key = 'BOX_TYPE_CODE'
  AND scope_key_1 = 'F001'
  AND scope_key_2 = 'P001';

COMMIT;
