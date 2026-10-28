-- 20261026_008_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_008 을 되돌린다: material_purchase_order.client_code(거래처코드) → client_name(거래처명).
--   - 값은 거래처마스터에서 그 코드의 이름을 넣는다(못 찾으면 코드 그대로). 사용자가 바꿀 때 예전 이름을 따로 남기지 않아 예전 글자와 다를 수 있다.
-- 서버 코드(발주 매퍼 · 서비스)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(client_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'material_purchase_order' AND column_name = 'client_code') THEN
        RETURN;
    END IF;
    UPDATE public.material_purchase_order p
    SET client_code = COALESCE((SELECT c.name FROM public.clients c WHERE c.client_code = p.client_code LIMIT 1), p.client_code)
    WHERE NULLIF(p.client_code, '') IS NOT NULL;
    ALTER TABLE public.material_purchase_order RENAME COLUMN client_code TO client_name;
END $$;

COMMIT;
