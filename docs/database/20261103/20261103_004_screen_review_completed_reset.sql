-- 20261103_004_screen_review_completed_reset.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 화면검수는 검수완료로 한 바퀴가 끝나면 현황이 미검수로 돌아간다(2026-11-03).
--   이미 검수완료로 남아 있는 현황을 미검수 · 요청일 비움으로 맞춘다. 이력은 그대로(검수완료 줄이 남는다)
--   다시 적용해도 같다. 표 구조는 바뀌지 않는다
-- 설계: docs/spec/20261103/20261103_004_화면검수_완료후_미검수_설계서.md
-- 롤백: 20261103_004_rollback.sql

BEGIN;

UPDATE tb_screen_review
   SET review_status = 'NOT_STARTED'
     , request_date  = NULL
     , updated_at    = now()
 WHERE review_status = 'COMPLETED';

COMMIT;
