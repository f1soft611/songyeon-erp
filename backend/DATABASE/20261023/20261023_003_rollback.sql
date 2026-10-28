-- 20261023_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_003 되돌리기 — 거래처 분류 코드를 예전 글자로 돌린다: 001 → 매입, 002 → 매출, 003 → 매입+매출
-- 주의: 서버 · 화면이 분류를 코드로 읽고 쓰므로, 롤백할 때는 그 코드도 20261023_006 이전으로 함께 돌린다.

BEGIN;

UPDATE public.clients
SET client_type = CASE client_type
        WHEN '001' THEN '매입'
        WHEN '002' THEN '매출'
        WHEN '003' THEN '매입+매출'
    END
WHERE client_type IN ('001', '002', '003');

COMMIT;
