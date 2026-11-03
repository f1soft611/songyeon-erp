-- 20261102_003_screen_review_schema.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 화면검수(화면마다 맨 오른쪽 [화면검수] → 오른쪽 패널) 저장 테이블
--       (2026-11-02 요청 "저장로직만들어줘 api까지", 사용자 결정: 지금 화면에 맞게 테이블 변경 · 바로 적용)
--   1) 설계서 2차(요구반영 · 기능점검 · 현업검수 3단계) 모양으로 먼저 만들어 둔 빈 테이블 4개를 지운다
--        tb_screen_review · tb_screen_review_history · tb_screen_review_draft · tb_screen_change_request
--        (저장소에 스크립트 없이 만들어져 있었다. 한 줄이라도 있으면 멈춘다)
--   2) 지금 화면(화면당 상태 하나)에 맞는 테이블 3개를 만든다
--        tb_screen_review          화면당 1줄: 상태 · 마지막 검수자/검수일 · 요청일 · 개발담당 · 개발완료일
--        tb_screen_review_history  저장할 때마다 1줄: 이전/새 상태 · 의견 · 검수자 · 검수일 (고치거나 지우지 않는다)
--        tb_screen_review_draft    화면 + 작성자당 1줄: 임시저장한 의견(상태 칸 없음)
--   - 검수자 · 작성자는 로그인 사용자 번호(tb_user.user_id). 이름은 조회할 때 tb_user 에서 붙인다
--   - 첨부는 tb_common_file 을 그대로 쓴다(컬럼 변경 없음): 이력 SCREEN_REVIEW + history_id, 임시저장 SCREEN_REVIEW_DRAFT + draft_id
--   - 개발담당 · 개발완료일은 개발사가 따로 넣는다(화면에서는 보기만). 요청일은 수정요청으로 저장한 날
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 1) 예전 모양(3단계) 빈 테이블 지우기
DO $$
DECLARE
    t text;
    n bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'tb_screen_review' AND column_name = 'req_status') THEN
        FOREACH t IN ARRAY ARRAY['tb_screen_review_history', 'tb_screen_change_request', 'tb_screen_review_draft', 'tb_screen_review'] LOOP
            IF to_regclass('public.' || t) IS NOT NULL THEN
                EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
                IF n > 0 THEN
                    RAISE EXCEPTION '%: 자료가 % 줄 있어 지우지 않는다', t, n;
                END IF;
            END IF;
        END LOOP;
        DROP TABLE IF EXISTS public.tb_screen_review_history;
        DROP TABLE IF EXISTS public.tb_screen_change_request;
        DROP TABLE IF EXISTS public.tb_screen_review_draft;
        DROP TABLE IF EXISTS public.tb_screen_review;
    END IF;
END $$;

-- 2) 지금 화면에 맞는 테이블
CREATE TABLE IF NOT EXISTS public.tb_screen_review (
    review_id          bigserial PRIMARY KEY,
    tenant_id          bigint       NOT NULL REFERENCES public.tb_tenant (tenant_id),
    menu_id            bigint       NOT NULL REFERENCES public.tb_menu (menu_id),
    review_status      varchar(20)  NOT NULL DEFAULT 'NOT_STARTED',
    reviewer_user_id   bigint       REFERENCES public.tb_user (user_id),
    review_date        date,
    request_date       date,
    developer_name     varchar(100),
    dev_completed_date date,
    created_at         timestamp    NOT NULL DEFAULT now(),
    created_by         bigint       NOT NULL,
    updated_at         timestamp    NOT NULL DEFAULT now(),
    updated_by         bigint       NOT NULL,
    CONSTRAINT uq_tb_screen_review_menu UNIQUE (tenant_id, menu_id),
    CONSTRAINT ck_tb_screen_review_status CHECK (review_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED'))
);
CREATE INDEX IF NOT EXISTS idx_tb_screen_review_status ON public.tb_screen_review (tenant_id, review_status);

COMMENT ON TABLE public.tb_screen_review IS '화면검수 현황(화면당 1줄)';
COMMENT ON COLUMN public.tb_screen_review.review_status IS '검수 상태: NOT_STARTED 미검수, IN_PROGRESS 검수진행중, CHANGE_REQUESTED 수정요청, COMPLETED 검수완료';
COMMENT ON COLUMN public.tb_screen_review.reviewer_user_id IS '마지막 검수자(tb_user.user_id)';
COMMENT ON COLUMN public.tb_screen_review.review_date IS '마지막 검수일';
COMMENT ON COLUMN public.tb_screen_review.request_date IS '요청일: 마지막으로 수정요청을 저장한 날';
COMMENT ON COLUMN public.tb_screen_review.developer_name IS '개발담당(개발사가 따로 넣는다)';
COMMENT ON COLUMN public.tb_screen_review.dev_completed_date IS '개발완료일(개발사가 따로 넣는다)';

CREATE TABLE IF NOT EXISTS public.tb_screen_review_history (
    history_id       bigserial PRIMARY KEY,
    tenant_id        bigint       NOT NULL REFERENCES public.tb_tenant (tenant_id),
    review_id        bigint       NOT NULL REFERENCES public.tb_screen_review (review_id),
    from_status      varchar(20)  NOT NULL,
    to_status        varchar(20)  NOT NULL,
    review_comment   varchar(500),
    reviewer_user_id bigint       NOT NULL REFERENCES public.tb_user (user_id),
    review_date      date         NOT NULL,
    created_at       timestamp    NOT NULL DEFAULT now(),
    CONSTRAINT ck_tb_screen_review_history_status CHECK (
        from_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
        AND to_status IN ('NOT_STARTED', 'IN_PROGRESS', 'CHANGE_REQUESTED', 'COMPLETED')
    )
);
CREATE INDEX IF NOT EXISTS idx_tb_screen_review_history_review
    ON public.tb_screen_review_history (tenant_id, review_id, history_id DESC);

COMMENT ON TABLE public.tb_screen_review_history IS '화면검수 이력(저장할 때마다 1줄, 고치거나 지우지 않는다). 첨부: tb_common_file SCREEN_REVIEW + history_id';

CREATE TABLE IF NOT EXISTS public.tb_screen_review_draft (
    draft_id       bigserial PRIMARY KEY,
    tenant_id      bigint       NOT NULL REFERENCES public.tb_tenant (tenant_id),
    menu_id        bigint       NOT NULL REFERENCES public.tb_menu (menu_id),
    writer_user_id bigint       NOT NULL REFERENCES public.tb_user (user_id),
    review_comment varchar(500),
    created_at     timestamp    NOT NULL DEFAULT now(),
    updated_at     timestamp    NOT NULL DEFAULT now(),
    CONSTRAINT uq_tb_screen_review_draft UNIQUE (tenant_id, menu_id, writer_user_id)
);

COMMENT ON TABLE public.tb_screen_review_draft IS '화면검수 임시저장(화면 + 작성자당 1줄, 상태 칸 없음). 첨부: tb_common_file SCREEN_REVIEW_DRAFT + draft_id';

COMMIT;
