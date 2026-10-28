-- 20261026_008_purchase_order_client_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 기록용: 2026-10-26 사용자가 직접 바꾼 것을 다른 DB 에도 똑같이 하려고 남긴다.
--   "material_purchase_order테이블에서 client_name을 client_code로 변경했어 저장도 코드로 할 수있게 해줘"
--   1) material_purchase_order.client_name(매입 거래처명) → 거래처마스터 거래처코드. 같은 이름이 여럿이면 코드가 작은 것(서버 저장 규칙과 같음).
--   2) 칸 이름 client_name → client_code(자리 · 형식 text 그대로).
--   - 거래처마스터에 없거나 코드 없는 거래처명이 있으면 멈춘다. 빈 값은 그대로.
--   - 송연 DB 에서는 사용자가 이미 바꿨다(2건 모두 거래처코드, 거래처마스터와 이어짐).
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'material_purchase_order' AND column_name = 'client_name') THEN
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.material_purchase_order p
               WHERE NULLIF(p.client_name, '') IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.name = p.client_name AND NULLIF(c.client_code, '') IS NOT NULL)) THEN
        RAISE EXCEPTION 'material_purchase_order.client_name 에 거래처마스터에 없거나 거래처코드가 없는 거래처가 있습니다. 먼저 정리하세요.';
    END IF;
    UPDATE public.material_purchase_order p
    SET client_name = (SELECT c.client_code FROM public.clients c
                        WHERE c.name = p.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                        ORDER BY c.client_code LIMIT 1)
    WHERE NULLIF(p.client_name, '') IS NOT NULL;
    ALTER TABLE public.material_purchase_order RENAME COLUMN client_name TO client_code;
END $$;

COMMIT;
