-- 20261016_007_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261016_007 되돌리기 — 공통코드 그룹 PACKING_TYPE 을 지운다.
-- 그 사이 상세코드나 자식 그룹이 생겼으면 지우지 않는다(화면에서 넣은 자료를 잃지 않게). 그때는 화면에서 먼저 정리한다.

BEGIN;

DELETE FROM tb_common_code_group g
USING tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND g.tenant_id = t.tenant_id
  AND g.group_code = 'PACKING_TYPE'
  AND NOT EXISTS (SELECT 1 FROM tb_common_code_item i WHERE i.group_id = g.common_code_group_id)
  AND NOT EXISTS (SELECT 1 FROM tb_common_code_group c WHERE c.parent_group_id = g.common_code_group_id);

COMMIT;
