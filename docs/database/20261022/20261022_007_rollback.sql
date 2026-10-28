-- 20261022_007_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_007 되돌리기 — 기안양식관리 메뉴 2개를 지우고(역할 권한은 FK CASCADE), 공지사항 구분 ALL · IMPORTANT 를 다시 사용으로.

BEGIN;

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
  AND m.menu_code = 'CO_WF_FORM';

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
  AND m.menu_code = 'CO_WORKFLOW';

UPDATE tb_common_code_item i
SET use_at = 'Y', updated_at = CURRENT_TIMESTAMP
FROM tb_common_code_group g
JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE i.group_id = g.common_code_group_id
  AND g.group_code = 'NOTICE_GUBUN'
  AND i.item_code IN ('ALL', 'IMPORTANT');

COMMIT;
