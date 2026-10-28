-- 20261023_007_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_007 되돌리기 — 바꾸기 전에 남긴 원래 단위 글자(bak_20261023_007_material_unit)로 돌리고 남긴 표를 지운다.
--   남긴 표에 없는 코드 줄(적용 뒤 새로 넣은 것)은 001 → kg, 002 → EA, 003 → BOX, 004 → M 으로 돌린다.
-- 주의: 서버 · 화면이 단위를 코드로 읽고 쓰므로, 롤백할 때는 그 코드도 20261023_007 이전으로 함께 돌린다.

BEGIN;

UPDATE public.materials m
SET unit = b.unit
FROM public.bak_20261023_007_material_unit b
WHERE b.code = m.code
  AND m.unit IN ('001', '002', '003', '004');

UPDATE public.materials
SET unit = CASE unit
        WHEN '001' THEN 'kg'
        WHEN '002' THEN 'EA'
        WHEN '003' THEN 'BOX'
        WHEN '004' THEN 'M'
    END
WHERE unit IN ('001', '002', '003', '004');

DROP TABLE IF EXISTS public.bak_20261023_007_material_unit;

COMMIT;
