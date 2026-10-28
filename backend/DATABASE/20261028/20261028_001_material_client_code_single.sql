-- 20261028_001_material_client_code_single.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료 · 부자재 납품업체를 거래처코드 배열이 아니라 거래처코드 한 곳으로 저장(2026-10-28 요청
--       "materials 테이블에 client_code 컬럼 배열로 들어가는것도 수정해주고", 사용자 결정: 납품업체는 한 곳만)
--   1) materials.client_code 의 거래처코드 배열('["000003"]')을 거래처코드 한 곳('000003')으로 바꾼다.
--   2) 빈 배열('[]')은 NULL 로 바꾼다.
--   - 두 곳 이상 든 배열이 있으면 바꾸지 않고 멈춘다(어느 곳을 남길지 사람이 정한다).
--   - 빈 값 · 이미 코드 한 곳인 값 · 배열이 아닌 옛 글자는 그대로 둔다.
--   - 롤백이 정확하도록 바꾸기 전 값을 bak_20261028_001_material_client_code 에 남긴다.
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 바꿀 줄이 없다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.materials
        WHERE replace(COALESCE(client_code, ''), ' ', '') ~ '^\[("[0-9]+",)+"[0-9]+"\]$'
    ) THEN
        RAISE EXCEPTION 'materials.client_code 에 납품업체가 두 곳 이상인 원재료가 있습니다. 먼저 한 곳으로 정리하세요.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bak_20261028_001_material_client_code (
    code text PRIMARY KEY,
    client_code text
);

INSERT INTO public.bak_20261028_001_material_client_code (code, client_code)
SELECT code, client_code
FROM public.materials
WHERE replace(COALESCE(client_code, ''), ' ', '') ~ '^\[("[0-9]+")?\]$'
ON CONFLICT (code) DO NOTHING;

UPDATE public.materials
SET client_code = NULLIF(client_code::jsonb ->> 0, '')
WHERE replace(COALESCE(client_code, ''), ' ', '') ~ '^\[("[0-9]+")?\]$';

COMMENT ON COLUMN public.materials.client_code IS '납품업체 거래처코드 한 곳(예: 000001, clients.client_code, 2026-10-28. 예전 거래처코드 배열 ["000001"])';

COMMIT;
