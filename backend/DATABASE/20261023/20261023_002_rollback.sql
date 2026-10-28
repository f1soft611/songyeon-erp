-- 20261023_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_002 되돌리기 — 거래처 사용여부 검사 제약과 컬럼을 지운다(사용안함으로 바꾼 값도 함께 사라진다).
-- 주의: 서버 · 화면이 use_yn 을 읽고 쓰기 시작한 뒤라면 그 코드도 함께 되돌린다.

BEGIN;

ALTER TABLE public.clients
    DROP CONSTRAINT IF EXISTS ck_clients_use_yn,
    DROP COLUMN IF EXISTS use_yn;

COMMIT;
