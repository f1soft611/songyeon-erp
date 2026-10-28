-- 20261002_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_005 되돌리기 — material_supplier.client_id 칸과 색인을 지운다.
--       업체명 칸(client_name)은 처음부터 함께 기록하므로 지워도 납품업체 정보는 남는다.

BEGIN;

DROP INDEX IF EXISTS idx_material_supplier_client_id;

ALTER TABLE material_supplier DROP COLUMN IF EXISTS client_id;

COMMIT;
