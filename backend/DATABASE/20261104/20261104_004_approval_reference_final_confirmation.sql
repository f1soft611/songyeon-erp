-- 20261104_004 전자결재 참조자 확인 · 참조 추가 이벤트 · 기안자 최종확인 DB 제약을 S_ERP 최신으로 맞춘다
-- S_ERP 20261029_001(참조자 CONFIRMED · REFERENCE_CONFIRMED) · 20261030_006(REFERENCE_ADDED) · 20261102_003(FINAL_CONFIRMATION)을 합친 것.
-- 마지막 S_ERP 스크립트(20261102_003)가 두 CHECK 를 최종 모양으로 다시 만들므로 그 내용을 그대로 쓴다.
-- 다른 점: 다시 적용해도 같도록 참여자 유일 인덱스를 먼저 지우고 만든다(IF EXISTS / IF NOT EXISTS). 새 표 · 칸 · 데이터 변경은 없다.

BEGIN;

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT IF EXISTS uq_electronic_approval_line_participant;

DROP INDEX IF EXISTS public.uq_electronic_approval_line_participant;

CREATE UNIQUE INDEX uq_electronic_approval_line_participant
    ON public.tb_electronic_approval_line_info (tenant_id, electronic_approval_id, participant_user_id)
    WHERE participant_type <> 'FINAL_CONFIRMATION';

CREATE UNIQUE INDEX IF NOT EXISTS uq_electronic_approval_line_final_confirmation
    ON public.tb_electronic_approval_line_info (tenant_id, electronic_approval_id)
    WHERE participant_type = 'FINAL_CONFIRMATION';

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_line_participant_type;

ALTER TABLE public.tb_electronic_approval_line_info
    ADD CONSTRAINT chk_electronic_approval_line_participant_type
    CHECK (participant_type IN ('APPROVAL', 'AGREEMENT', 'REFERENCE', 'FINAL_CONFIRMATION'));

ALTER TABLE public.tb_electronic_approval_line_info
    DROP CONSTRAINT IF EXISTS chk_electronic_approval_line_action;

ALTER TABLE public.tb_electronic_approval_line_info
    ADD CONSTRAINT chk_electronic_approval_line_action
    CHECK (
        (
            participant_type = 'REFERENCE'
            AND (
                (
                    action_status IS NULL
                    AND pending_at IS NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status = 'CONFIRMED'
                    AND pending_at IS NULL
                    AND action_at IS NOT NULL
                    AND action_comment IS NULL
                )
            )
        )
        OR (
            participant_type IN ('APPROVAL', 'AGREEMENT')
            AND action_status IS NOT NULL
            AND (
                (
                    action_status = 'WAITING'
                    AND pending_at IS NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status = 'PENDING'
                    AND pending_at IS NOT NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status IN ('APPROVED', 'REJECTED', 'RETURNED')
                    AND action_at IS NOT NULL
                )
            )
        )
        OR (
            participant_type = 'FINAL_CONFIRMATION'
            AND action_status IS NOT NULL
            AND (
                (
                    action_status = 'WAITING'
                    AND pending_at IS NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status = 'PENDING'
                    AND pending_at IS NOT NULL
                    AND action_at IS NULL
                    AND action_comment IS NULL
                )
                OR (
                    action_status = 'CONFIRMED'
                    AND pending_at IS NOT NULL
                    AND action_at IS NOT NULL
                    AND action_comment IS NULL
                )
            )
        )
    );

ALTER TABLE public.tb_common_comment
    DROP CONSTRAINT IF EXISTS chk_tb_common_comment_event_type;

ALTER TABLE public.tb_common_comment
    ADD CONSTRAINT chk_tb_common_comment_event_type
    CHECK (
        (
            comment_type = 'USER'
            AND event_type IS NULL
        )
        OR (
            comment_type = 'SYSTEM'
            AND event_type IS NOT NULL
            AND length(btrim(event_type)) > 0
            AND event_type IN (
                'APPROVED',
                'REJECTED',
                'RETURNED',
                'DRAFT_SAVED',
                'SUBMITTED',
                'RESUBMITTED',
                'COMPLETED',
                'DELETED',
                'SUBMISSION_CANCELED',
                'APPROVAL_CANCELED',
                'REFERENCE_CONFIRMED',
                'REFERENCE_ADDED',
                'FINAL_CONFIRMATION_CONFIRMED'
            )
        )
    );

COMMIT;
