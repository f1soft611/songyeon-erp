-- 20261023_008_add_material_audit_columns.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료 · 부자재 등록자 · 등록일시 · 수정자 · 수정일시(2026-10-23 요청 "materials 테이블도 등록자~수정일시 컬럼 추가해줘 포장유형처럼")
--   포장유형(tb_box_type) · 제품(products)과 같은 이름 · 형식으로 원재료 표(materials)에 4칸을 더한다.
--   - reg_user_id VARCHAR(20) · reg_dt TIMESTAMP: 원재료 · 부자재 신규 등록 때(사번 = 로그인 사원)
--   - upd_user_id VARCHAR(20) · upd_dt TIMESTAMP: 원재료 · 부자재 창의 기본정보 저장 · 단가 저장 뒤
--   재고 수량 변동(입고 · 재고조정 · 생산 차감) · 창고 이름 따라가기 · 적용일 자동 단가 반영은 수정으로 치지 않는다.
--   이미 있는 원재료 · 부자재는 비워 둔다(알 수 없음).
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.materials
    ADD COLUMN IF NOT EXISTS reg_user_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS reg_dt TIMESTAMP,
    ADD COLUMN IF NOT EXISTS upd_user_id VARCHAR(20),
    ADD COLUMN IF NOT EXISTS upd_dt TIMESTAMP;

COMMENT ON COLUMN public.materials.reg_user_id IS '등록자 사번(2026-10-23)';
COMMENT ON COLUMN public.materials.reg_dt IS '등록일시(2026-10-23)';
COMMENT ON COLUMN public.materials.upd_user_id IS '수정자 사번(2026-10-23)';
COMMENT ON COLUMN public.materials.upd_dt IS '수정일시(2026-10-23)';

COMMIT;
