-- 20261023_007_material_unit_to_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료 · 부자재 단위를 공통코드 UNIT 값으로 저장한다(2026-10-23 요청 "원재료랑 부자재 단위도 공통코드 UNIT 로 봐야될듯",
--   거래처 분류 · 부자재 분류와 같게 저장은 코드, 화면은 이름).
--   사용자가 만든 공통코드 UNIT(SONGYEON): 001 KG · 002 EA · 003 BOX · 004 M
--   materials.unit 의 글자를 대소문자 · 앞뒤 공백 없이 견줘 코드로 바꾼다: kg/KG → 001, EA → 002, BOX → 003, M → 004
--   (빈 값 · 이미 코드인 줄 · 다른 값은 건드리지 않는다)
-- 다시 돌려도 결과가 같다.
-- 주의: 같은 DB 를 쓰는 예전 송연 파이썬 프로그램이 unit 글자를 직접 보면 그쪽 표시가 코드로 보인다.

BEGIN;

DO $$
BEGIN
    IF (SELECT count(*)
        FROM tb_common_code_item i
        JOIN tb_common_code_group g ON g.common_code_group_id = i.group_id AND g.group_code = 'UNIT'
        JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
        WHERE i.item_code IN ('001', '002', '003', '004')) <> 4 THEN
        RAISE EXCEPTION '공통코드 UNIT 에 001 · 002 · 003 · 004 가 모두 있어야 합니다';
    END IF;
END $$;

-- 롤백이 원래 글자(대소문자 그대로)로 돌릴 수 있게 바꾸기 전 값을 남긴다(이미 남겼으면 그대로)
CREATE TABLE IF NOT EXISTS public.bak_20261023_007_material_unit (
    code TEXT PRIMARY KEY,
    unit TEXT
);
INSERT INTO public.bak_20261023_007_material_unit (code, unit)
SELECT code, unit
FROM public.materials
WHERE UPPER(BTRIM(unit)) IN ('KG', 'EA', 'BOX', 'M')
ON CONFLICT (code) DO NOTHING;

UPDATE public.materials
SET unit = CASE UPPER(BTRIM(unit))
        WHEN 'KG' THEN '001'
        WHEN 'EA' THEN '002'
        WHEN 'BOX' THEN '003'
        WHEN 'M' THEN '004'
    END
WHERE UPPER(BTRIM(unit)) IN ('KG', 'EA', 'BOX', 'M');

COMMIT;
