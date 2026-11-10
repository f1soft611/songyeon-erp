-- 20261104_002 롤백: 쪽지 표를 지운다(주고받은 쪽지도 함께 지워진다).
-- 쪽지 받음 알림(tb_notification 의 DIRECT_MESSAGE_RECEIVED)도 원본이 없어지므로 함께 지운다.
BEGIN;

DELETE FROM public.tb_notification WHERE source_type = 'DIRECT_MESSAGE';
DROP TABLE IF EXISTS public.tb_direct_message;
DROP TABLE IF EXISTS public.tb_direct_message_thread;

COMMIT;
