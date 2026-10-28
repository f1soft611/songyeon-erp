-- 20261026_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 20261026_002 를 되돌린다: production_schedule.client_code(거래처코드) → client_name(거래처명).
--   - 백업 표(bak_20261026_002_production_schedule_client)에 있고 코드가 그대로인 줄은 백업의 예전 이름으로 되돌린다.
--   - 적용 뒤 새로 넣었거나 거래처를 바꾼 줄은 거래처마스터에서 그 코드의 이름을 넣는다(코드가 없으면 코드 그대로 둔다).
--   - 백업 표는 지우지 않는다(필요 없으면 따로 지운다).
-- 서버 코드(매퍼의 client_code)도 함께 돌려야 한다.
-- 다시 돌려도 결과가 같다(client_name 이 이미 있으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'client_code')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'client_name') THEN

        IF to_regclass('public.bak_20261026_002_production_schedule_client') IS NOT NULL THEN
            -- 백업과 코드가 같은 줄은 예전 이름, 나머지는 거래처마스터 이름
            UPDATE public.production_schedule s
            SET client_code = COALESCE(
                    (SELECT b.client_name FROM public.bak_20261026_002_production_schedule_client b
                      WHERE b.id = s.id AND b.client_code = s.client_code),
                    (SELECT c.name FROM public.clients c WHERE c.client_code = s.client_code LIMIT 1),
                    s.client_code)
            WHERE NULLIF(s.client_code, '') IS NOT NULL;
        ELSE
            UPDATE public.production_schedule s
            SET client_code = COALESCE((SELECT c.name FROM public.clients c WHERE c.client_code = s.client_code LIMIT 1), s.client_code)
            WHERE NULLIF(s.client_code, '') IS NOT NULL;
        END IF;

        ALTER TABLE public.production_schedule RENAME COLUMN client_code TO client_name;
    END IF;
END $$;

COMMIT;
