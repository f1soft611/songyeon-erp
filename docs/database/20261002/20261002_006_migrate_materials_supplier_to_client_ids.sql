-- 20261002_006_migrate_materials_supplier_to_client_ids.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: materials.supplier 에 납품업체 업체명 대신 업체코드(clients.id) 배열을 넣는다. 예: '다온' → '[3]'
--       조회는 이 배열의 업체코드로 clients 와 조인해 업체명을 가져온다.
-- 순서: material_supplier 에 적어 둔 납품업체(등록 순) → 없으면 supplier 의 업체명과 같은 거래처.
--       거래처BOM 에 없는 업체명은 바꾸지 않고 그대로 둔다(화면에서 이름 그대로 보이고, 다시 고르면 업체코드로 저장됨).

BEGIN;

-- 바꾸기 전 값을 남겨 둔다(롤백용)
CREATE TABLE IF NOT EXISTS bak_20261002_006_materials_supplier AS
SELECT code, supplier FROM materials WHERE false;

INSERT INTO bak_20261002_006_materials_supplier (code, supplier)
SELECT code, supplier
FROM materials
WHERE supplier IS NOT NULL
  AND supplier <> ''
  AND NOT EXISTS (SELECT 1 FROM bak_20261002_006_materials_supplier b WHERE b.code = materials.code);

-- material_supplier 에 업체코드가 적힌 원재료: 등록 순서대로 배열
UPDATE materials m
SET supplier = s.ids
FROM (
    SELECT
        ms.material_code,
        '[' || string_agg(DISTINCT_ID.client_id::text, ',' ORDER BY DISTINCT_ID.first_id) || ']' AS ids
    FROM (
        SELECT
            x.material_code,
            COALESCE(x.client_id, c.id) AS client_id,
            MIN(x.id) AS first_id
        FROM material_supplier x
        LEFT JOIN clients c ON c.name = x.client_name
        WHERE COALESCE(x.client_id, c.id) IS NOT NULL
        GROUP BY x.material_code, COALESCE(x.client_id, c.id)
    ) DISTINCT_ID
    JOIN material_supplier ms ON ms.id = DISTINCT_ID.first_id
    GROUP BY ms.material_code
) s
WHERE m.code = s.material_code;

-- 그 밖에 supplier 에 업체명만 있는 원재료: 같은 이름의 거래처 업체코드로
UPDATE materials m
SET supplier = '[' || c.id || ']'
FROM clients c
WHERE c.name = m.supplier
  AND m.supplier NOT LIKE '[%';

COMMIT;
