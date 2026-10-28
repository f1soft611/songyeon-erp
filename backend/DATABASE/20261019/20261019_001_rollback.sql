-- 20261019_001_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_001 되돌리기 — tb_box_type 과 그 트리거를 지운다.
-- 주의
--   - 표를 지우면 포장유형 자료가 모두 사라진다. 필요하면 먼저 백업한다.
--   - 코드(포장유형 화면 · 단가관리 · 견적 · 제품등록의 포장유형 목록)도 이 표를 읽는다. 표만 지우면 그 화면들이 목록을 못 받는다.
--   - fn_set_upd_dt() 는 다른 표 트리거가 쓰지 않을 때만 지운다.

BEGIN;

DROP TRIGGER IF EXISTS tg_box_type_upd ON tb_box_type;
DROP TABLE IF EXISTS tb_box_type;

DO $$
BEGIN
    IF to_regproc('fn_set_upd_dt') IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE NOT tgisinternal AND tgfoid = to_regproc('fn_set_upd_dt')
    ) THEN
        DROP FUNCTION IF EXISTS fn_set_upd_dt();
    END IF;
END $$;

COMMIT;
