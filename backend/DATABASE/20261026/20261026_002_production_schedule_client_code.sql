-- 20261026_002_production_schedule_client_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 생산확정(production_schedule)의 거래처를 거래처명이 아니라 거래처코드로 저장(2026-10-26 요청 "client_name 도 client_code로 바꿔줘")
--   1) client_name(거래처명)을 거래처마스터(clients)의 거래처코드로 바꾼다. 같은 이름이 여럿이면 코드가 작은 것(서버 저장 규칙과 같음).
--   2) 칸 이름을 client_code 로 바꾼다(형식 text, 자리 그대로: schedule_date 뒤 3번째).
--   - 거래처마스터에 없는 이름이나 거래처코드가 빈 거래처가 있으면 바꾸지 않고 멈춘다.
--   - 빈 값은 그대로 둔다.
--   - 롤백이 정확하도록 바꾸기 전 값을 bak_20261026_002_production_schedule_client 에 남긴다.
-- 다시 돌려도 결과가 같다(이미 바뀌었으면 건너뛴다).

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'production_schedule' AND column_name = 'client_name') THEN

        IF EXISTS (
            SELECT 1
            FROM public.production_schedule s
            WHERE NULLIF(s.client_name, '') IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.clients c
                              WHERE c.name = s.client_name AND NULLIF(c.client_code, '') IS NOT NULL)
        ) THEN
            RAISE EXCEPTION 'production_schedule.client_name 에 거래처마스터에 없거나 거래처코드가 없는 거래처가 있습니다. 먼저 정리하세요.';
        END IF;

        IF to_regclass('public.bak_20261026_002_production_schedule_client') IS NULL THEN
            CREATE TABLE public.bak_20261026_002_production_schedule_client AS
            SELECT s.id, s.client_name,
                   (SELECT c.client_code FROM public.clients c
                     WHERE c.name = s.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                     ORDER BY c.client_code LIMIT 1) AS client_code
            FROM public.production_schedule s
            WHERE NULLIF(s.client_name, '') IS NOT NULL;
        END IF;

        UPDATE public.production_schedule s
        SET client_name = (SELECT c.client_code FROM public.clients c
                            WHERE c.name = s.client_name AND NULLIF(c.client_code, '') IS NOT NULL
                            ORDER BY c.client_code LIMIT 1)
        WHERE NULLIF(s.client_name, '') IS NOT NULL;

        ALTER TABLE public.production_schedule RENAME COLUMN client_name TO client_code;
    END IF;
END $$;

COMMIT;
