-- 20261023_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_001 되돌리기 — 거래처코드 고유 인덱스와 컬럼을 지운다(매긴 코드 값도 함께 사라진다).
-- 주의: 서버가 client_code 를 넣고 읽으므로, 롤백할 때는 거래처마스터 매퍼 · 서비스도 20261023_001 이전으로 함께 돌린다.

BEGIN;

DROP INDEX IF EXISTS public.uq_clients_client_code;

ALTER TABLE public.clients
    DROP COLUMN IF EXISTS client_code;

COMMIT;
