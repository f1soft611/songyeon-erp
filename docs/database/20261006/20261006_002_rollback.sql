-- 20261006_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261006_002 되돌리기 — 대응표(bak_20261006_002_code_map)로 원재료코드를 원래 번호로 돌리고 대응표를 지운다.
-- 주의: 적용 뒤 새로 등록한 원재료가 원래 번호(예: 000027·000028)를 이미 쓰고 있으면 기본키가 겹쳐 실패한다(그 경우 그 원재료를 먼저 확인).

BEGIN;

UPDATE bom x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_price_log x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_price_schedule x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_purchase_order x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_receiving x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_stock_movement x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_stock_schedule x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_supplier x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE material_warehouse_move x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE production_material_substitution x SET from_material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.from_material_code = m.new_code;
UPDATE production_material_substitution x SET to_material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.to_material_code = m.new_code;
UPDATE production_material_usage x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE recipe_version_bom x SET material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.new_code;
UPDATE products x SET film_material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.film_material_code = m.new_code;
UPDATE products x SET pouch_material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.pouch_material_code = m.new_code;
UPDATE products x SET box_material_code = m.old_code FROM bak_20261006_002_code_map m WHERE x.box_material_code = m.new_code;

-- 큰 번호부터 되돌린다(돌아갈 자리가 늘 비어 있게)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT old_code, new_code FROM bak_20261006_002_code_map ORDER BY CAST(new_code AS NUMERIC) DESC LOOP
        UPDATE materials SET code = r.old_code WHERE code = r.new_code;
    END LOOP;
END $$;

DROP TABLE IF EXISTS bak_20261006_002_code_map;

COMMIT;
