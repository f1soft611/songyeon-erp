-- 20261102_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261102_003_screen_review_schema.sql 되돌리기
--   - 화면검수 테이블 3개(tb_screen_review · tb_screen_review_history · tb_screen_review_draft)를 지우고,
--     그 전에 있던 설계서 2차 모양의 빈 테이블 4개를 다시 만든다.
--   - 화면검수 자료(이력 · 임시저장)가 한 줄이라도 있으면 멈춘다. 자료를 버려도 되면 먼저 따로 보관하고 지운다.
--   - tb_common_file 의 SCREEN_REVIEW · SCREEN_REVIEW_DRAFT 첨부 행은 건드리지 않는다.
--   - 화면 · 서버 코드도 함께 돌려야 한다.

BEGIN;

DO $$
DECLARE
    t text;
    n bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'tb_screen_review' AND column_name = 'reviewer_user_id') THEN
        FOREACH t IN ARRAY ARRAY['tb_screen_review_history', 'tb_screen_review_draft', 'tb_screen_review'] LOOP
            EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
            IF n > 0 THEN
                RAISE EXCEPTION '%: 자료가 % 줄 있어 지우지 않는다', t, n;
            END IF;
        END LOOP;
        DROP TABLE IF EXISTS public.tb_screen_review_history;
        DROP TABLE IF EXISTS public.tb_screen_review_draft;
        DROP TABLE IF EXISTS public.tb_screen_review;
    END IF;
END $$;

-- 설계서 2차 모양(요구반영 · 기능점검 · 현업검수 3단계)
CREATE TABLE IF NOT EXISTS public.tb_screen_review (
    review_id          bigserial PRIMARY KEY,
    tenant_id          bigint      NOT NULL REFERENCES public.tb_tenant (tenant_id),
    menu_id            bigint      NOT NULL REFERENCES public.tb_menu (menu_id),
    review_status      varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
    review_round       integer     NOT NULL DEFAULT 1,
    first_completed_at timestamp,
    req_status         varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
    req_reviewer_id    bigint      REFERENCES public.tb_login_account (login_id),
    req_review_date    date,
    func_status        varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
    func_reviewer_id   bigint      REFERENCES public.tb_login_account (login_id),
    func_review_date   date,
    user_status        varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
    user_reviewer_id   bigint      REFERENCES public.tb_login_account (login_id),
    user_review_date   date,
    note               varchar(500),
    created_at         timestamp   NOT NULL DEFAULT now(),
    created_by         bigint      NOT NULL,
    updated_at         timestamp   NOT NULL DEFAULT now(),
    updated_by         bigint      NOT NULL,
    CONSTRAINT uq_tb_screen_review_menu UNIQUE (tenant_id, menu_id),
    CONSTRAINT ck_tb_screen_review_round CHECK (review_round >= 1),
    CONSTRAINT ck_tb_screen_review_status CHECK (
        review_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
        AND req_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
        AND func_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
        AND user_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
    )
);
CREATE INDEX IF NOT EXISTS idx_tb_screen_review_status ON public.tb_screen_review (tenant_id, review_status);

CREATE TABLE IF NOT EXISTS public.tb_screen_change_request (
    change_request_id    bigserial PRIMARY KEY,
    tenant_id            bigint        NOT NULL REFERENCES public.tb_tenant (tenant_id),
    review_id            bigint        NOT NULL REFERENCES public.tb_screen_review (review_id),
    request_type         varchar(20)   NOT NULL,
    request_status       varchar(20)   NOT NULL DEFAULT 'REQUESTED',
    request_content      varchar(1000) NOT NULL,
    requester_id         bigint        NOT NULL REFERENCES public.tb_login_account (login_id),
    request_date         date          NOT NULL,
    schedule_impact_days integer,
    impact_note          varchar(500),
    review_round         integer,
    processed_by         bigint        REFERENCES public.tb_login_account (login_id),
    processed_at         timestamp,
    process_note         varchar(500),
    completed_at         timestamp,
    created_at           timestamp     NOT NULL DEFAULT now(),
    created_by           bigint        NOT NULL,
    updated_at           timestamp     NOT NULL DEFAULT now(),
    updated_by           bigint        NOT NULL,
    CONSTRAINT ck_tb_screen_change_request_type CHECK (request_type IN ('DEFECT', 'CHANGE')),
    CONSTRAINT ck_tb_screen_change_request_status CHECK (
        request_status IN ('REQUESTED', 'ACCEPTED', 'COMPLETED', 'REJECTED')
    )
);
CREATE INDEX IF NOT EXISTS idx_tb_screen_change_request_review
    ON public.tb_screen_change_request (tenant_id, review_id, request_status);

CREATE TABLE IF NOT EXISTS public.tb_screen_review_history (
    history_id        bigserial PRIMARY KEY,
    tenant_id         bigint      NOT NULL REFERENCES public.tb_tenant (tenant_id),
    review_id         bigint      NOT NULL REFERENCES public.tb_screen_review (review_id),
    review_round      integer     NOT NULL,
    change_request_id bigint      REFERENCES public.tb_screen_change_request (change_request_id),
    stage             varchar(20) NOT NULL,
    from_status       varchar(20) NOT NULL,
    to_status         varchar(20) NOT NULL,
    review_comment    varchar(500),
    reviewer_id       bigint      NOT NULL REFERENCES public.tb_login_account (login_id),
    review_date       date        NOT NULL,
    created_at        timestamp   NOT NULL DEFAULT now(),
    created_by        bigint      NOT NULL,
    CONSTRAINT ck_tb_screen_review_history_stage CHECK (stage IN ('REQUIREMENT', 'FUNCTION', 'USER')),
    CONSTRAINT ck_tb_screen_review_history_status CHECK (
        from_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
        AND to_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
    )
);
CREATE INDEX IF NOT EXISTS idx_tb_screen_review_history_review
    ON public.tb_screen_review_history (tenant_id, review_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tb_screen_review_draft (
    draft_id       bigserial PRIMARY KEY,
    tenant_id      bigint      NOT NULL REFERENCES public.tb_tenant (tenant_id),
    menu_id        bigint      NOT NULL REFERENCES public.tb_menu (menu_id),
    stage          varchar(20) NOT NULL,
    writer_id      bigint      NOT NULL REFERENCES public.tb_login_account (login_id),
    review_comment varchar(500),
    review_date    date,
    created_at     timestamp   NOT NULL DEFAULT now(),
    updated_at     timestamp   NOT NULL DEFAULT now(),
    CONSTRAINT uq_tb_screen_review_draft UNIQUE (tenant_id, menu_id, stage, writer_id),
    CONSTRAINT ck_tb_screen_review_draft_stage CHECK (stage IN ('REQUIREMENT', 'FUNCTION', 'USER'))
);

COMMIT;
