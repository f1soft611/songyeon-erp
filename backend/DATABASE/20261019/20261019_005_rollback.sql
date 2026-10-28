-- 20261019_005_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_005 되돌리기 — 창고등록이 만든 번호표 줄(tb_id_sequence 키 WAREHOUSE_CODE)을 지운다.
-- 주의
--   - tb_warehouse 는 테이블 설계자가 만든 표이고 tb_warehouse_location 이 참조한다. 이 파일은 표를 지우지 않는다.
--     표를 지우는 것은 설계자 판단이다. 필요하면 아래 주석의 DROP 을 설계자와 확인한 뒤에만 쓴다(자료가 모두 지워진다).
--   - 화면을 옛 warehouses 표로 되돌리려면 코드(매퍼 · 서비스 · 화면)도 함께 되돌려야 한다. 옛 warehouses 표와 자료(6줄)는 그대로 남아 있다.
--   - 창고등록 화면에서 등록 · 수정 · 삭제한 tb_warehouse 줄은 되돌리지 않는다.

BEGIN;

DELETE FROM tb_id_sequence
WHERE generator_key = 'WAREHOUSE_CODE'
  AND scope_key_1 = 'F001'
  AND scope_key_2 = 'P001';

-- DROP TABLE IF EXISTS tb_warehouse;   -- 설계자 확인 뒤에만. tb_warehouse_location 이 참조하므로 먼저 그 FK(fk_wh_loc_wh)를 정리해야 한다

COMMIT;
