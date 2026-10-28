-- 20261023_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_005 되돌리기 — 거래처 표의 등록자 · 수정자 · 수정일시 칸을 지운다(쌓인 값도 사라진다). created_at 은 그대로.
-- 주의: 서버가 이 칸을 읽고 쓰므로, 롤백할 때는 거래처마스터 서버 코드도 20261023_005 이전으로 함께 돌린다.

BEGIN;

ALTER TABLE public.clients
    DROP COLUMN IF EXISTS upd_dt,
    DROP COLUMN IF EXISTS upd_user_id,
    DROP COLUMN IF EXISTS reg_user_id;

COMMIT;
