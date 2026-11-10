-- 20261104_001 알림(tb_notification) 만들기
-- S_ERP 20261030_005(tb_notification) · 20261030_008(archived_at · 인덱스)와 같은 구조다.
-- 다른 점: 받는 사람(recipient_user_id)은 송연 사번(varchar(20), employees.id)이다(20261103_003 사번 통일).
-- 알림 종류는 S_ERP 와 같이 '결재 댓글 멘션' · '쪽지 받음' 둘. 쪽지 표는 다음 단계(쪽지함)에서 만든다.
-- 다시 적용해도 같다(IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS public.tb_notification (
    notification_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    recipient_user_id VARCHAR(20) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    source_type VARCHAR(30) NOT NULL,
    source_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    CONSTRAINT fk_notification_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_recipient
        FOREIGN KEY (recipient_user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT uq_notification_source_recipient
        UNIQUE (tenant_id, recipient_user_id, event_type, source_type, source_id),
    CONSTRAINT chk_notification_event_source
        CHECK (
            (event_type = 'APPROVAL_COMMENT_MENTION' AND source_type = 'APPROVAL_COMMENT')
            OR
            (event_type = 'DIRECT_MESSAGE_RECEIVED' AND source_type = 'DIRECT_MESSAGE')
        ),
    CONSTRAINT chk_notification_title
        CHECK (LENGTH(BTRIM(title)) > 0),
    CONSTRAINT chk_notification_summary
        CHECK (LENGTH(BTRIM(summary)) > 0)
);

COMMENT ON TABLE public.tb_notification IS '사용자별 알림(결재 댓글 멘션 · 쪽지 받음)';
COMMENT ON COLUMN public.tb_notification.recipient_user_id IS '받는 사람 사번(employees.id)';
COMMENT ON COLUMN public.tb_notification.source_id IS '알림 원본 ID(결재 댓글 comment_id · 쪽지 message_id)';
COMMENT ON COLUMN public.tb_notification.archived_at IS '받는 사람이 지운(보관) 시각. 목록 · 미읽음 수에서 뺀다';

CREATE INDEX IF NOT EXISTS idx_notification_recipient_unread
    ON public.tb_notification (tenant_id, recipient_user_id, created_at DESC, notification_id DESC)
    WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_recipient_page
    ON public.tb_notification (tenant_id, recipient_user_id, created_at DESC, notification_id DESC);
CREATE INDEX IF NOT EXISTS idx_notification_active_page
    ON public.tb_notification (tenant_id, recipient_user_id, created_at DESC, notification_id DESC)
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_active_unread
    ON public.tb_notification (tenant_id, recipient_user_id)
    WHERE read_at IS NULL AND archived_at IS NULL;

COMMIT;
