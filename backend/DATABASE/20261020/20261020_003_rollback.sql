-- 20261020_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261020_003 되돌리기 — WH-001 을 WH-002 로 되돌린다.
-- 주의: 자동 코드를 '번호표'로 매기던 방식으로 되돌리려면 코드(WarehouseServiceImpl · BoxTypeServiceImpl)도 함께 되돌린다.

BEGIN;

UPDATE tb_warehouse
SET warehouse_cd = 'WH-002'
WHERE warehouse_cd = 'WH-001'
  AND factory_code = 'F001'
  AND plant_code = 'P001'
  AND NOT EXISTS (SELECT 1 FROM tb_warehouse x WHERE x.warehouse_cd = 'WH-002');

COMMIT;
