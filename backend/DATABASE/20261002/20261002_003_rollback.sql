-- 20261002_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261002_003 되돌리기 — 송연 메뉴 설명(menu_dc)을 20261002_002 직후 값으로 돌린다
--   (전환된 화면은 '송연 화면코드 …', 나머지는 NULL)

BEGIN;

UPDATE tb_menu m
SET menu_dc = x.menu_dc,
    updated_at = now()
FROM (VALUES
  ('product', '송연 화면코드 SA0001'), ('pricing', '송연 화면코드 SA0002'), ('quote', '송연 화면코드 SA0003'),
  ('order', '송연 화면코드 SA0004'), ('shipment', '송연 화면코드 SA0005'), ('prod-check', '송연 화면코드 SA0006'),
  ('settings', '송연 화면코드 CM0001'), ('production', '송연 화면코드 CM0002'), ('logistics', '송연 화면코드 CM0003'),
  ('prod-confirm', '송연 화면코드 PD0001'), ('actual', '송연 화면코드 PD0002'), ('prod-status', '송연 화면코드 PD0003'),
  ('label-print', '송연 화면코드 PD0004'), ('product-stock', '송연 화면코드 LG0001'), ('ship-confirm', '송연 화면코드 LG0002'),
  ('ship-status', '송연 화면코드 LG0003')
) AS x(menu_code, menu_dc),
     tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = x.menu_code;

UPDATE tb_menu m
SET menu_dc = NULL,
    updated_at = now()
FROM tb_tenant t, tb_module md
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND md.module_id = m.module_id
  AND md.module_code IN ('DASH', 'COMM', 'SA', 'CM', 'PD', 'LG', 'SL', 'PU', 'QM', 'RD', 'HA')
  AND (m.menu_dc IS NULL OR m.menu_dc NOT LIKE '송연 화면코드%');

COMMIT;
