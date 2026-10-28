-- 20261020_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261020_001 되돌리기 — 번호표 BOX_TYPE_CODE 를 바꾸기 전 값(3)으로 돌린다.
-- 주의: 그 사이 자동 코드를 새로 뽑았다면 그만큼 더 큰 값이 맞다. 서버는 이미 있는 코드를 건너뛰므로 겹치지는 않는다.

BEGIN;

UPDATE tb_id_sequence
SET last_issued_value = 3,
    updated_at = CURRENT_TIMESTAMP
WHERE generator_key = 'BOX_TYPE_CODE'
  AND scope_key_1 = 'F001'
  AND scope_key_2 = 'P001'
  AND last_issued_value < 3;

COMMIT;
