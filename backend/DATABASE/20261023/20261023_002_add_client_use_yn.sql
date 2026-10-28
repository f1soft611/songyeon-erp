-- 20261023_002_add_client_use_yn.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 거래처마스터 사용여부(2026-10-23 요청 "일단 db컬럼생성해주고") — 거래처 표(clients)에 사용여부 컬럼을 더한다.
--   - use_yn CHAR(1) NOT NULL DEFAULT 'Y', 값은 Y/N 만(포장유형 tb_box_type · 창고 tb_warehouse 의 use_yn 과 같은 정의)
--   - 있는 거래처는 기본값으로 모두 Y(사용)가 된다.
--   - 화면 · 서버 연결(사용여부 체크박스, 다른 화면 거래처 목록에서 숨기기)은 이어서 따로 한다.
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS use_yn CHAR(1) NOT NULL DEFAULT 'Y';

COMMENT ON COLUMN public.clients.use_yn IS '사용여부(Y 사용 / N 사용안함, 2026-10-23)';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.clients'::regclass
                     AND conname = 'ck_clients_use_yn') THEN
        ALTER TABLE public.clients
            ADD CONSTRAINT ck_clients_use_yn CHECK (use_yn IN ('Y', 'N'));
    END IF;
END $$;

COMMIT;
