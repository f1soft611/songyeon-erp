-- 20261102_002_pu_module_categories.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 구매관리(/pu)에 중분류를 두어 화면을 그 아래로 옮기고, 발주관리 탭을 발주등록 · 발주현황 두 화면으로 나눈다
--       (2026-11-02 요청 "구매관리도 중분류 나눠주는데 발주관리에 발주등록 발주현황 화면 따로 만드려고 탭으로 안 하고",
--        사용자 결정: 중분류 4개 · 입고관리 탭은 그대로 · 폴더 · API · 화면ID 까지 맞춤 · 표준 구조 정리)
--   1) 모듈은 그대로(PU /pu)
--   2) 중분류(권한 행 없음, 영업관리 · 생산관리 · 물류관리 · 판매관리 중분류와 같은 모양)
--        PU_ORDER    발주관리 /pu/order     순서 1
--        PU_INBOUND  입고관리 /pu/inbound   순서 2
--        PU_STOCK    재고관리 /pu/stock     순서 3
--        PU_DOCUMENT 문서관리 /pu/document  순서 4
--   3) 화면ID(menu_code = 주소 마지막 칸): 분류 글자 + 화면 뜻(영어) + View
--        발주관리 PO: po → POOrderRegisterView(10, 이름 발주관리 → 발주등록), 새 화면 POOrderStatusView(20, 발주현황)
--        입고관리 IB: recv → IBReceivingView(10), mat-sub → IBSubstitutionView(20)
--        재고관리 ST: purchase → STStockLedgerView(10), stock → STStockAdjustView(20), stock-status → STStockStatusView(30)
--        문서관리 DC: documents → DCDocumentBoxView(10)
--   4) 새 화면 발주현황의 권한은 예전 발주관리(메뉴 권한 · 역할 권한)를 그대로 복사한다. 탭일 때와 같은 사람이 같은 권한으로 본다
--   - 기존 메뉴 번호 · 권한 행(tb_menu_permission · tb_role_menu_permission)은 그대로다.
-- 다시 돌려도 결과가 같다.

BEGIN;

-- 화면ID 를 먼저 바꾼다(중분류 코드와 겹치지 않게)
UPDATE tb_menu m
SET menu_code = v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('po',           'POOrderRegisterView'),
             ('recv',         'IBReceivingView'),
             ('mat-sub',      'IBSubstitutionView'),
             ('purchase',     'STStockLedgerView'),
             ('stock',        'STStockAdjustView'),
             ('stock-status', 'STStockStatusView'),
             ('documents',    'DCDocumentBoxView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.module_id = (SELECT md.module_id FROM tb_module md WHERE md.tenant_id = t.tenant_id AND md.module_code = 'PU')
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, v.code, v.name, v.url, NULL, v.sort_order, 'Y', NULL
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'PU'
CROSS JOIN (VALUES ('PU_ORDER',    '발주관리', '/pu/order',    1),
                   ('PU_INBOUND',  '입고관리', '/pu/inbound',  2),
                   ('PU_STOCK',    '재고관리', '/pu/stock',    3),
                   ('PU_DOCUMENT', '문서관리', '/pu/document', 4)) AS v(code, name, url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 새 화면 발주현황
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, p.menu_id, 'POOrderStatusView', '발주현황', p.menu_url || '/POOrderStatusView', NULL, 20, 'Y', '기간별 발주현황을 확인해요'
FROM tb_tenant t
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = 'PU'
JOIN tb_menu p ON p.tenant_id = t.tenant_id AND p.menu_code = 'PU_ORDER'
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

UPDATE tb_menu c
SET parent_menu_id = p.menu_id,
    menu_url = p.menu_url || '/' || c.menu_code,
    sort_order = v.sort_order,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('POOrderRegisterView', 'PU_ORDER',    10),
             ('IBReceivingView',     'PU_INBOUND',  10),
             ('IBSubstitutionView',  'PU_INBOUND',  20),
             ('STStockLedgerView',   'PU_STOCK',    10),
             ('STStockAdjustView',   'PU_STOCK',    20),
             ('STStockStatusView',   'PU_STOCK',    30),
             ('DCDocumentBoxView',   'PU_DOCUMENT', 10)) AS v(code, parent_code, sort_order),
     tb_menu p
WHERE t.tenant_code = 'SONGYEON'
  AND c.tenant_id = t.tenant_id
  AND p.tenant_id = t.tenant_id
  AND c.menu_code = v.code
  AND p.menu_code = v.parent_code
  AND (c.parent_menu_id IS DISTINCT FROM p.menu_id OR c.menu_url <> p.menu_url || '/' || c.menu_code OR c.sort_order <> v.sort_order);

-- 예전 발주관리가 이제 발주등록 화면이다
UPDATE tb_menu m
SET menu_nm = '발주등록',
    menu_dc = '원재료 발주를 등록해요',
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = 'POOrderRegisterView'
  AND m.menu_nm <> '발주등록';

-- 발주현황 권한 = 발주등록(예전 발주관리) 권한
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT s.menu_id, mp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'POOrderRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'POOrderStatusView'
JOIN tb_menu_permission mp ON mp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_menu_permission x WHERE x.menu_id = s.menu_id AND x.permission_id = mp.permission_id);

INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT rp.role_id, s.menu_id, rp.permission_id
FROM tb_tenant t
JOIN tb_menu r ON r.tenant_id = t.tenant_id AND r.menu_code = 'POOrderRegisterView'
JOIN tb_menu s ON s.tenant_id = t.tenant_id AND s.menu_code = 'POOrderStatusView'
JOIN tb_role_menu_permission rp ON rp.menu_id = r.menu_id
WHERE t.tenant_code = 'SONGYEON'
  AND NOT EXISTS (SELECT 1 FROM tb_role_menu_permission x WHERE x.role_id = rp.role_id AND x.menu_id = s.menu_id AND x.permission_id = rp.permission_id);

COMMIT;
