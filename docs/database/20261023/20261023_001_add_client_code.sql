-- 20261023_001_add_client_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 거래처마스터 6자리 자동번호(계획 · 사양서 20261023_001) — 거래처 표(clients)에 코드 컬럼을 더한다.
--   - client_code VARCHAR(6): 서버가 매긴다(6자리 숫자 코드 가운데 가장 큰 번호 + 1, 없으면 000001). 화면은 보여 주지 않는다.
--   - 있는 거래처: 등록 순서(id)대로 000001 부터 번호를 준다(이미 코드가 있는 줄은 건드리지 않는다).
--   - 고유 인덱스: 코드가 있는 줄끼리 겹치지 않게 한다(코드가 빈 줄은 겹쳐도 된다).
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS client_code VARCHAR(6);

COMMENT ON COLUMN public.clients.client_code IS '거래처코드(6자리 숫자, 서버 자동번호 2026-10-23)';

WITH base AS (
    SELECT COALESCE(MAX(CAST(client_code AS INTEGER)), 0) AS max_no
    FROM public.clients
    WHERE client_code ~ '^[0-9]{6}$'
), todo AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.id) AS rn
    FROM public.clients c
    WHERE c.client_code IS NULL
)
UPDATE public.clients c
SET client_code = LPAD(CAST(base.max_no + todo.rn AS TEXT), 6, '0')
FROM todo, base
WHERE c.id = todo.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_client_code
    ON public.clients (client_code)
    WHERE client_code IS NOT NULL;

COMMIT;
