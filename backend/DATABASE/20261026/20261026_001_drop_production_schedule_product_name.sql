-- 20261026_001_drop_production_schedule_product_name.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 기록용: 2026-10-26 사용자가 직접 지운 것을 다른 DB 에도 똑같이 하려고 남긴다.
--   "production_schedule 테이블에서 product_name컬럼을 지웠어 이제 product_code로 product_name찾게 해주고"
--   - production_schedule.product_name(품명(규격) 글자)을 지운다. 품목은 product_code(제품코드)로만 남는다.
--   - 지우기 전에 product_code 가 비었거나 제품마스터에 없는 줄이 있으면 멈춘다(지우면 품목을 알 수 없게 된다).
--   - 송연 DB 에서는 사용자가 이미 지웠다(적용 때 5건 모두 product_code 가 제품마스터와 이어졌다).
-- 다시 돌려도 결과가 같다(이미 지웠으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'product_name') THEN
        IF EXISTS (SELECT 1 FROM public.production_schedule s
                   WHERE NULLIF(s.product_code, '') IS NULL
                      OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.code = s.product_code)) THEN
            RAISE EXCEPTION 'production_schedule 에 제품코드가 비었거나 제품마스터에 없는 줄이 있습니다. 먼저 product_code 를 채우세요.';
        END IF;
        ALTER TABLE public.production_schedule DROP COLUMN product_name;
    END IF;
END $$;

COMMIT;
