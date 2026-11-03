-- 20261103_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261103_001_screen_review_request_no.sql 되돌리기
--   - tb_screen_review_history 의 요청 번호 제약 · 칸을 지운다. 매겨진 번호는 함께 사라진다(다른 값은 그대로).
--   - 화면 · 서버 코드도 함께 돌려야 한다(서버가 request_no 를 넣고 읽는다).

BEGIN;

ALTER TABLE tb_screen_review_history
    DROP CONSTRAINT IF EXISTS uk_screen_review_history_request_no;

ALTER TABLE tb_screen_review_history
    DROP COLUMN IF EXISTS request_no;

COMMIT;
