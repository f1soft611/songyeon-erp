-- 20261023_009_add_material_use_yn.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 원재료 · 부자재 사용여부(2026-10-23 요청 "테이블에 사용여부 컬럼 추가해주고 ... 조회조건도 포장유형처럼 추가해줘")
--   원재료 표(materials)에 사용여부 컬럼을 더한다.
--   - use_yn CHAR(1) NOT NULL DEFAULT 'Y', 값은 Y/N 만(포장유형 tb_box_type · 거래처 clients 의 use_yn 과 같은 정의)
--   - 있는 원재료 · 부자재는 기본값으로 모두 Y(사용)가 된다.
--   - 원재료마스터 · 부자재마스터의 사용여부 체크박스 + [저장]이 바꾼다(바꾸면 수정자 · 수정일시도 남긴다).
-- 다시 돌려도 결과가 같다.

BEGIN;

ALTER TABLE public.materials
    ADD COLUMN IF NOT EXISTS use_yn CHAR(1) NOT NULL DEFAULT 'Y';

COMMENT ON COLUMN public.materials.use_yn IS '사용여부(Y 사용 / N 사용안함, 2026-10-23)';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.materials'::regclass
                     AND conname = 'ck_materials_use_yn') THEN
        ALTER TABLE public.materials
            ADD CONSTRAINT ck_materials_use_yn CHECK (use_yn IN ('Y', 'N'));
    END IF;
END $$;

COMMIT;
