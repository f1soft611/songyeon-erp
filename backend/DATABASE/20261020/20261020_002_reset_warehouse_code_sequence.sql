-- 20261020_002_reset_warehouse_code_sequence.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 창고 자동 코드(WH-001 …)가 1번부터 나오게 한다(2026-10-20 요청: "WH-004 부터 저장돼, 001 부터 시작하게 해줘").
--   - 자료를 지우고 새로 등록한 첫 자동 코드 WH-004 를 WH-001 로 바꾼다(가리키는 곳 없음: 상위창고 · 창고 위치 0건).
--   - 번호표(tb_id_sequence 키 WAREHOUSE_CODE · F001 · P001)를 1로 맞춘다. 다음 자동 코드는 WH-002 다.
--   - 서버는 자동 번호를 뽑을 때 이미 있는 코드를 건너뛴다.
-- 다시 돌려도 결과가 같다(WH-004 가 없으면 바꾸지 않는다).

BEGIN;

UPDATE tb_warehouse
SET warehouse_cd = 'WH-001'
WHERE warehouse_cd = 'WH-004'
  AND factory_code = 'F001'
  AND plant_code = 'P001'
  AND NOT EXISTS (SELECT 1 FROM tb_warehouse x WHERE x.warehouse_cd = 'WH-001')
  AND NOT EXISTS (SELECT 1 FROM tb_warehouse u WHERE u.upper_warehouse_cd = 'WH-004');

UPDATE tb_id_sequence
SET last_issued_value = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE generator_key = 'WAREHOUSE_CODE'
  AND scope_key_1 = 'F001'
  AND scope_key_2 = 'P001';

COMMIT;
