-- 20261104_001 롤백: 알림 표를 지운다(쌓인 알림도 함께 지워진다)
BEGIN;

DROP TABLE IF EXISTS public.tb_notification;

COMMIT;
