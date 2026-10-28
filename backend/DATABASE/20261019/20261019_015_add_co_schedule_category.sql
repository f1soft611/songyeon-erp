-- 20261019_015_add_co_schedule_category.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리에 분류 '스케줄관리'(menu_code schedule, /co/schedule)를 만들고 생산스케줄 · 물류스케줄을 그 아래로 옮긴다.
--   - 분류 순서 2(기초정보 1 다음), 권한 행 없음(기초정보 분류와 같은 모양)
--   - 생산스케줄: /co/production → /co/schedule/production, 순서 10
--   - 물류스케줄: /co/logistics  → /co/schedule/logistics,  순서 20
--   - 화면 키(주소 마지막 칸 production · logistics)는 그대로라 화면 코드는 바꾸지 않는다. 메뉴 번호 · 권한 행도 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, 'schedule', '스케줄관리', '/co/schedule', NULL, 2, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'CO'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = '/co/schedule/' || c.menu_code,
    sort_order = CASE c.menu_code WHEN 'production' THEN 10 ELSE 20 END,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'schedule'
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND c.module_id = p.module_id
  AND c.menu_code IN ('production', 'logistics')
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> '/co/schedule/' || c.menu_code);

COMMIT;
