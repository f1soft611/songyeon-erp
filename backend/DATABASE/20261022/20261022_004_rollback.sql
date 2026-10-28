-- 20261022_004_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_004 되돌리기 — 댓글 좋아요 표를 지우고 tb_common_comment 에 더한 제약 · 컬럼을 뺀다.
-- 주의: 좋아요 기록과 시스템 댓글 구분(comment_type · event_type) 값이 함께 사라진다.
--       결재 화면(4단계)이 들어온 뒤라면 시스템 댓글이 쌓여 있을 수 있으니 확인하고 돌린다.

BEGIN;

DROP TABLE IF EXISTS public.tb_common_comment_like;

ALTER TABLE public.tb_common_comment
    DROP CONSTRAINT IF EXISTS chk_tb_common_comment_event_type,
    DROP CONSTRAINT IF EXISTS uq_tb_common_comment_tenant_comment,
    DROP COLUMN IF EXISTS event_type,
    DROP COLUMN IF EXISTS comment_type;

COMMIT;
