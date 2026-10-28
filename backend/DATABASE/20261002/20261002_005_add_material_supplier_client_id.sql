-- 20261002_005_add_material_supplier_client_id.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료 납품업체를 업체명이 아니라 업체코드(clients.id)로 저장한다.
--       업체명 칸(client_name)은 송연 원본 프로그램이 계속 읽으므로 남겨두고 같이 기록한다.

BEGIN;

ALTER TABLE material_supplier ADD COLUMN IF NOT EXISTS client_id INTEGER;

COMMENT ON COLUMN material_supplier.client_id IS '납품업체 업체코드(clients.id). 조회 때 clients 와 조인해 업체명을 가져온다';

-- 이미 저장된 줄은 업체명으로 업체코드를 찾아 채운다(거래처BOM 에 없는 이름은 비워 둠)
UPDATE material_supplier ms
SET client_id = c.id
FROM clients c
WHERE ms.client_id IS NULL
  AND c.name = ms.client_name;

CREATE INDEX IF NOT EXISTS idx_material_supplier_client_id ON material_supplier (client_id);

COMMIT;
