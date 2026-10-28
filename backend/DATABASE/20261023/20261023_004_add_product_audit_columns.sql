-- 20261023_004_add_product_audit_columns.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 제품마스터 등록자 · 등록일시 · 수정자 · 수정일시(2026-10-23 사용자 요청, 결정: "DB 칼럼 추가")
--   포장유형(tb_box_type)과 같은 이름 · 형식으로 제품 표(products)에 4칸을 더한다.
--   - reg_user_id VARCHAR(20): 등록한 사원 사번(employees.id) — 영업관리 > 제품등록 때 넣는다
--   - reg_dt TIMESTAMP: 등록일시
--   - upd_user_id VARCHAR(20): 마지막으로 고친 사원 사번 — 제품 창(정보 · 배합비 · 부자재) · 사용여부 저장 때 넣는다
--   - upd_dt TIMESTAMP: 수정일시
--   재고 수량 변동 · 라벨등록은 수정으로 치지 않는다. 이미 있는 제품은 비워 둔다(알 수 없음).
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS reg_user_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS reg_dt TIMESTAMP,
    ADD COLUMN IF NOT EXISTS upd_user_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS upd_dt TIMESTAMP;

COMMENT ON COLUMN public.products.reg_user_id IS '등록자 사번(2026-10-23)';
COMMENT ON COLUMN public.products.reg_dt IS '등록일시(2026-10-23)';
COMMENT ON COLUMN public.products.upd_user_id IS '수정자 사번(2026-10-23)';
COMMENT ON COLUMN public.products.upd_dt IS '수정일시(2026-10-23)';

COMMIT;
