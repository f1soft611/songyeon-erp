-- 20261019_001_seed_box_type.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: tb_box_type 샘플 2건(테이블 설계자 스크립트의 '화면 캡처 기준 2건'). 2026-10-19 에 그 스크립트로 이미 들어갔다.
-- 다시 돌려도 겹치지 않게 ON CONFLICT DO NOTHING 을 붙였다(원본은 트랜잭션 밖 · 중복 시 오류).

BEGIN;

INSERT INTO tb_box_type (
    factory_code, plant_code, box_type_cd, box_type_nm, pack_qty, pack_unit,
    fixed_margin_rate, loss_rate, labor_cost, packing_cost, logistics_cost, margin_amt,
    sort_seq, reg_user_id
) VALUES
 ('F001','P001','BOX005KG','소포장 5kg',   5,  'KG', 15.000, 3.000, 1200, 850, 500, 2000, 1, 'admin'),
 ('F001','P001','BOX500G', '소포장 500g', 500, 'G',  12.000, 2.500,  400, 320, 180,  700, 2, 'admin')
ON CONFLICT (factory_code, plant_code, box_type_cd, apply_start_dt) DO NOTHING;

COMMIT;
