-- 20261104_002 쪽지(1:1 대화방 · 쪽지) 만들기
-- S_ERP 20261030_005(tb_direct_message_thread · tb_direct_message) · 20261030_009(대화방 숨김 시각)와 같은 구조다.
-- 다른 점: 사람 칸(참여자 · 보낸 사람 · 받는 사람)은 송연 사번(varchar(20), employees.id)이다(20261103_003 사번 통일).
-- 다시 적용해도 같다(IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS public.tb_direct_message_thread (
    thread_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    participant_a_user_id VARCHAR(20) NOT NULL,
    participant_b_user_id VARCHAR(20) NOT NULL,
    subject VARCHAR(120),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    participant_a_hidden_at TIMESTAMP,
    participant_b_hidden_at TIMESTAMP,
    CONSTRAINT fk_direct_message_thread_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_thread_participant_a
        FOREIGN KEY (participant_a_user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_thread_participant_b
        FOREIGN KEY (participant_b_user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT uq_direct_message_thread_tenant_id UNIQUE (tenant_id, thread_id),
    CONSTRAINT chk_direct_message_thread_participants
        CHECK (participant_a_user_id < participant_b_user_id),
    CONSTRAINT chk_direct_message_thread_subject
        CHECK (subject IS NULL OR LENGTH(subject) <= 120)
);

COMMENT ON TABLE public.tb_direct_message_thread IS '1:1 쪽지 대화방(두 사람, 사번 순서 a < b)';
COMMENT ON COLUMN public.tb_direct_message_thread.participant_a_hidden_at
    IS 'participant_a 사용자가 대화방을 삭제(숨김)한 시각. 이 시각 이전 메시지는 해당 사용자에게 표시하지 않는다.';
COMMENT ON COLUMN public.tb_direct_message_thread.participant_b_hidden_at
    IS 'participant_b 사용자가 대화방을 삭제(숨김)한 시각. 이 시각 이전 메시지는 해당 사용자에게 표시하지 않는다.';

CREATE INDEX IF NOT EXISTS idx_direct_message_thread_participant_a
    ON public.tb_direct_message_thread (tenant_id, participant_a_user_id, updated_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_direct_message_thread_participant_b
    ON public.tb_direct_message_thread (tenant_id, participant_b_user_id, updated_at DESC, thread_id DESC);

CREATE TABLE IF NOT EXISTS public.tb_direct_message (
    message_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    thread_id BIGINT NOT NULL,
    sender_user_id VARCHAR(20) NOT NULL,
    recipient_user_id VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT fk_direct_message_thread
        FOREIGN KEY (tenant_id, thread_id)
        REFERENCES public.tb_direct_message_thread (tenant_id, thread_id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_sender
        FOREIGN KEY (sender_user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_direct_message_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT chk_direct_message_distinct_users
        CHECK (sender_user_id <> recipient_user_id),
    CONSTRAINT chk_direct_message_content
        CHECK (LENGTH(BTRIM(content)) BETWEEN 1 AND 5000)
);

COMMENT ON TABLE public.tb_direct_message IS '1:1 쪽지(보낸 사람 · 받는 사람 사번)';

CREATE INDEX IF NOT EXISTS idx_direct_message_thread_order
    ON public.tb_direct_message (tenant_id, thread_id, created_at ASC, message_id ASC);
CREATE INDEX IF NOT EXISTS idx_direct_message_inbox_unread
    ON public.tb_direct_message (tenant_id, recipient_user_id, created_at DESC, message_id DESC)
    WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_direct_message_sender
    ON public.tb_direct_message (tenant_id, sender_user_id, created_at DESC, message_id DESC);

COMMIT;
