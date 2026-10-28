-- 20261020_003_warehouse_code_max_plus_one.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 창고 · 포장유형 자동 코드를 '번호표(tb_id_sequence)' 대신 '표에 있는 가장 큰 자동 번호 + 1' 로 매기게 바꾼 뒤(코드 변경),
--       방금 다시 받은 창고 자동 코드 WH-002 를 WH-001 로 맞춘다(2026-10-20 요청: "또 지우고 등록했는데 001 로 안 나오고 002 로 나와").
--   - 원인: 번호표는 한 번 쓴 번호를 기억해서, 줄을 지워도 다음 번호로 이어졌다.
--   - 이제 자료를 다 지우면 다시 WH-001 · PACK-001 부터 나온다. 번호표의 WAREHOUSE_CODE · BOX_TYPE_CODE 줄은 더 쓰지 않는다(지우지 않음).
--   - WH-002 를 가리키는 곳 없음(상위창고 · 창고 위치 0건).
-- 다시 돌려도 결과가 같다.

BEGIN;

UPDATE tb_warehouse
SET warehouse_cd = 'WH-001'
WHERE warehouse_cd = 'WH-002'
  AND factory_code = 'F001'
  AND plant_code = 'P001'
  AND NOT EXISTS (SELECT 1 FROM tb_warehouse x WHERE x.warehouse_cd = 'WH-001')
  AND NOT EXISTS (SELECT 1 FROM tb_warehouse u WHERE u.upper_warehouse_cd = 'WH-002');

COMMIT;
