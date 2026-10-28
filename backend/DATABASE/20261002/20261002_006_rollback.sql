-- 20261002_006_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_006 되돌리기 — materials.supplier 를 바꾸기 전 값(업체명)으로 되돌린다.
--       적용 뒤 화면에서 새로 저장한 원재료(백업에 없는 것)는 첫 업체코드의 업체명으로 바꾼다.

BEGIN;

UPDATE materials m
SET supplier = b.supplier
FROM bak_20261002_006_materials_supplier b
WHERE b.code = m.code;

UPDATE materials m
SET supplier = c.name
FROM clients c
WHERE m.supplier LIKE '[%'
  AND m.supplier ~ '^[[][0-9, ]*[]]$'
  AND c.id = NULLIF(split_part(trim(both '[]' from m.supplier), ',', 1), '')::int;

UPDATE materials
SET supplier = NULL
WHERE supplier IN ('[]', '');

DROP TABLE IF EXISTS bak_20261002_006_materials_supplier;

COMMIT;
