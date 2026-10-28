-- 20261006_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261006_001 되돌리기 — 합치기 전 원재료(000014·000015)·단가 변경 이력·배합비·단가표를 백업 표에서 되살리고 백업 표를 지운다.

BEGIN;

INSERT INTO materials SELECT * FROM bak_20261006_001_materials ON CONFLICT (code) DO NOTHING;

INSERT INTO material_price_log SELECT * FROM bak_20261006_001_material_price_log ON CONFLICT DO NOTHING;

-- 배합비: 백업한 줄(제품코드·순번으로 찾음)을 합치기 전 값으로
UPDATE bom b
SET material_code = k.material_code,
    material_name = k.material_name,
    ratio_percent = k.ratio_percent,
    unit_price_per_kg = k.unit_price_per_kg,
    amount_per_kg = k.amount_per_kg
FROM bak_20261006_001_bom k
WHERE b.product_code = k.product_code
  AND b.rank_in_product = k.rank_in_product;

UPDATE pricing p
SET material_cost = k.material_cost,
    total_price = k.total_price
FROM bak_20261006_001_pricing k
WHERE p.product_code = k.product_code;

DROP TABLE IF EXISTS bak_20261006_001_materials;
DROP TABLE IF EXISTS bak_20261006_001_bom;
DROP TABLE IF EXISTS bak_20261006_001_material_price_log;
DROP TABLE IF EXISTS bak_20261006_001_pricing;

COMMIT;
