-- 20261022_004_common_comment_like.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 그룹웨어 이관 1단계(공통 기반) — S_ERP 공통 댓글(CommonComment) 매퍼가 쓰는 구조를 송연 DB 에 맞춘다.
--   - tb_common_comment: comment_type · event_type 컬럼, (tenant_id, comment_id) 고유키, 시스템 이벤트 검사 제약
--   - tb_common_comment_like: 댓글 좋아요 표(새로 만듦)
-- 근거: S_ERP DB 의 현재 표 정의를 읽어 같게 맞췄다.
--   (S_ERP 스크립트 20261008_003 · 20261008_004 · 20261012_001 의 댓글 부분을 합친 최종 상태)
-- 여러 번 실행해도 결과가 같다.

BEGIN;

ALTER TABLE public.tb_common_comment
    ADD COLUMN IF NOT EXISTS comment_type VARCHAR(20) NOT NULL DEFAULT 'USER',
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.tb_common_comment'::regclass
                     AND conname = 'uq_tb_common_comment_tenant_comment') THEN
        ALTER TABLE public.tb_common_comment
            ADD CONSTRAINT uq_tb_common_comment_tenant_comment UNIQUE (tenant_id, comment_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.tb_common_comment'::regclass
                     AND conname = 'chk_tb_common_comment_event_type') THEN
        ALTER TABLE public.tb_common_comment
            ADD CONSTRAINT chk_tb_common_comment_event_type
            CHECK (
                (comment_type = 'USER' AND event_type IS NULL)
                OR (
                    comment_type = 'SYSTEM'
                    AND event_type IS NOT NULL
                    AND LENGTH(BTRIM(event_type)) > 0
                    AND event_type IN (
                        'APPROVED', 'REJECTED', 'RETURNED', 'DRAFT_SAVED',
                        'SUBMITTED', 'RESUBMITTED', 'COMPLETED', 'DELETED',
                        'SUBMISSION_CANCELED', 'APPROVAL_CANCELED'
                    )
                )
            );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tb_common_comment_like (
    comment_like_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    comment_id BIGINT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_common_comment_like_tenant FOREIGN KEY (tenant_id)
        REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_common_comment_like_comment FOREIGN KEY (tenant_id, comment_id)
        REFERENCES public.tb_common_comment (tenant_id, comment_id) ON DELETE CASCADE,
    CONSTRAINT uq_common_comment_like_actor UNIQUE (tenant_id, comment_id, user_id)
);

COMMIT;
