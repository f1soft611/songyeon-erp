-- 20261023_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_004 되돌리기 — 제품 표의 등록자 · 등록일시 · 수정자 · 수정일시 칸을 지운다(쌓인 값도 사라진다).
-- 주의: 서버가 이 칸을 읽고 쓰므로, 롤백할 때는 제품 목록 · 제품등록 · 제품 저장 코드도 20261023_004 이전으로 함께 돌린다.

BEGIN;

ALTER TABLE public.products
    DROP COLUMN IF EXISTS upd_dt,
    DROP COLUMN IF EXISTS upd_user_id,
    DROP COLUMN IF EXISTS reg_dt,
    DROP COLUMN IF EXISTS reg_user_id;

COMMIT;
