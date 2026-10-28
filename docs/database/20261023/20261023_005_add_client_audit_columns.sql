-- 20261023_005_add_client_audit_columns.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 거래처마스터 등록자 · 등록일시 · 수정자 · 수정일시(2026-10-23 사용자 결정: 등록일시는 기존 created_at 을 쓴다)
--   거래처 표(clients)에 3칸을 더한다(이름 · 형식은 포장유형 · 제품과 같음).
--   - reg_user_id VARCHAR(20): 등록한 사원 사번 — [거래처 등록] · 엑셀 올리기의 새 거래처 때 넣는다
--   - upd_user_id VARCHAR(20): 마지막으로 고친 사원 사번 — 거래처 창 저장 · 엑셀 덮어쓰기 · 사용여부 저장 때 넣는다
--   - upd_dt TIMESTAMP: 수정일시
--   등록일시는 있는 created_at(글자, YYYY-MM-DDTHH:MM:SS, 19건 모두 채워져 있음)을 그대로 쓴다.
--   이미 있는 거래처의 등록자 · 수정자는 비워 둔다(알 수 없음).
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS reg_user_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS upd_user_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS upd_dt TIMESTAMP;

COMMENT ON COLUMN public.clients.reg_user_id IS '등록자 사번(2026-10-23). 등록일시는 created_at';
COMMENT ON COLUMN public.clients.upd_user_id IS '수정자 사번(2026-10-23)';
COMMENT ON COLUMN public.clients.upd_dt IS '수정일시(2026-10-23)';

COMMIT;
