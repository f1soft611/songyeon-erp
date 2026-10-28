-- 20261006_002_renumber_material_codes.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료코드의 빈 번호를 없앤다(사용자 요청). 20261006_001 로 000014·000015 를 지워 생긴 빈칸을 메우도록
--       원재료를 코드 순서대로 000001 부터 다시 번호 매긴다(적용 당시: 000016~000028 → 000014~000026).
-- 원재료코드를 담는 모든 칸을 같이 바꾼다(지금 비어 있는 칸 포함). 코드가 글자 속에 박힌 곳은 적용 전 확인 결과 없음.
-- 바꾼 대응표는 bak_20261006_002_code_map 에 남긴다(롤백용).

BEGIN;

-- ===== 대응표: 코드 순서대로 000001, 000002 … (바뀌는 것만) =====
CREATE TABLE bak_20261006_002_code_map AS
SELECT code AS old_code, new_code
FROM (
    SELECT code, LPAD(ROW_NUMBER() OVER (ORDER BY CAST(code AS NUMERIC))::text, 6, '0') AS new_code
    FROM materials
    WHERE code ~ '^[0-9]+$'
) t
WHERE code <> new_code;

-- ===== 원재료코드를 담는 칸 =====
UPDATE bom x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_price_log x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_price_schedule x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_purchase_order x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_receiving x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_stock_movement x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_stock_schedule x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_supplier x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE material_warehouse_move x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE production_material_substitution x SET from_material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.from_material_code = m.old_code;
UPDATE production_material_substitution x SET to_material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.to_material_code = m.old_code;
UPDATE production_material_usage x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE recipe_version_bom x SET material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.material_code = m.old_code;
UPDATE products x SET film_material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.film_material_code = m.old_code;
UPDATE products x SET pouch_material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.pouch_material_code = m.old_code;
UPDATE products x SET box_material_code = m.new_code FROM bak_20261006_002_code_map m WHERE x.box_material_code = m.old_code;

-- ===== 원재료 자체: 작은 코드부터 하나씩(바꿀 자리가 늘 비어 있어 기본키가 겹치지 않음) =====
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT old_code, new_code FROM bak_20261006_002_code_map ORDER BY CAST(old_code AS NUMERIC) LOOP
        UPDATE materials SET code = r.new_code WHERE code = r.old_code;
    END LOOP;
END $$;

COMMIT;
