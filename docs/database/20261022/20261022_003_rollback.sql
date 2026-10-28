-- 20261022_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_003 되돌리기 — 게시판 종류(NOTICE · ARCHIVE)와 그룹웨어 메뉴 7개를 지운다.
-- 주의
--   - 메뉴를 지우면 기능 권한 · 역할 권한은 FK CASCADE 로 함께 지워진다. GROUPWARE 모듈 자체는 사용자가 등록한 것이라 남긴다.
--   - 게시판 종류는 메뉴를 RESTRICT 로 가리키므로 먼저 지운다. 공지 · 자료실 글이 생긴 뒤라면 글이 게시판 종류를 가리킬 수 있으니 확인하고 돌린다.

BEGIN;

DELETE FROM tb_board_type bt
USING tb_menu m, tb_tenant t
WHERE m.menu_id = bt.menu_id
  AND t.tenant_id = m.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND bt.board_type_code IN ('NOTICE', 'ARCHIVE')
  AND m.menu_code IN ('GW_NOTICE', 'GW_ARCHIVE');

-- 아래 메뉴 먼저, 그다음 맨 위 메뉴(부모를 지우면 자식도 CASCADE 로 지워지지만 순서대로 둔다)
DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_id = m.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND m.menu_code IN ('DOC_WRITE', 'DOC_READ', 'GW_NOTICE', 'GW_ARCHIVE');

DELETE FROM tb_menu m
USING tb_tenant t
WHERE t.tenant_id = m.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND m.menu_code IN ('GW_OVERVIEW', 'GW_DOCUMENTS', 'GW_INFO_CENTER');

COMMIT;
