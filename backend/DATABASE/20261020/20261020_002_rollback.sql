-- 20261020_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261020_002 되돌리기 — WH-001 을 WH-004 로, 번호표 WAREHOUSE_CODE 를 바꾸기 전 값(4)으로 돌린다.
-- 주의: 그 사이 WH-001 을 다른 창고에 썼거나 자동 코드를 더 뽑았다면 값을 맞춰서 돌린다.

BEGIN;

UPDATE tb_warehouse
SET warehouse_cd = 'WH-004'
WHERE warehouse_cd = 'WH-001'
  AND factory_code = 'F001'
  AND plant_code = 'P001'
  AND NOT EXISTS (SELECT 1 FROM tb_warehouse x WHERE x.warehouse_cd = 'WH-004');

UPDATE tb_id_sequence
SET last_issued_value = 4,
    updated_at = CURRENT_TIMESTAMP
WHERE generator_key = 'WAREHOUSE_CODE'
  AND scope_key_1 = 'F001'
  AND scope_key_2 = 'P001'
  AND last_issued_value < 4;

COMMIT;
