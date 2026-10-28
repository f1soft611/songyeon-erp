-- 20261023_009_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_009 되돌리기 — 원재료 사용여부 검사 제약과 컬럼을 지운다(사용안함으로 바꾼 값도 함께 사라진다).
-- 주의: 서버 · 화면이 use_yn 을 읽고 쓰므로, 롤백할 때는 원재료 · 부자재 코드도 20261023_009 이전으로 함께 돌린다.

BEGIN;

ALTER TABLE public.materials
    DROP CONSTRAINT IF EXISTS ck_materials_use_yn,
    DROP COLUMN IF EXISTS use_yn;

COMMIT;
