-- 20261002_002_seed_songyeon_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 송연 메뉴 구성(분류 11개, 메뉴 42개)을 tb_module / tb_menu 에 등록
-- 기준: 송연 변환본 frontend/src/shared/config/navigation.ts (기존 pricing.html·03-shell.js 의 분류·순서·이름)
-- 규칙:
--   module_code = 송연 분류 id(대문자), module_url = /<분류 id 소문자>
--   menu_code   = 송연 메뉴 id(기존 화면 ID), menu_url = /<분류>/<메뉴 id>  → 화면 연결 키(pageKey)는 메뉴 id
--   송연에는 역할·권한 개념이 없으므로 모든 메뉴에 조회·등록·수정·삭제·엑셀을 열어둔다(로그인 사용자 전원 사용).
--   환경설정(SETTINGS) 모듈은 20261002_001 에서 S_ERP 와 같게 등록했다(정렬 99, 맨 뒤).
-- 선행: 20261002_001_seed_songyeon_settings_menu.sql

BEGIN;

-- 1. 모듈 (송연 분류)
INSERT INTO tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
SELECT t.tenant_id, m.module_code, m.module_nm, m.icon_nm, m.module_url, m.sort_order, 'Y'
FROM tb_tenant t
CROSS JOIN (VALUES
  ('DASH', '대시보드',   'Dashboard',      '/dash', 1),
  ('COMM', '메신저·AI',  'Notifications',  '/comm', 2),
  ('SA',   '영업관리',   'ListAlt',        '/sa',   3),
  ('CM',   '공통관리',   'Build',          '/cm',   4),
  ('PD',   '생산관리',   'Assignment',     '/pd',   5),
  ('LG',   '물류관리',   'Inventory',      '/lg',   6),
  ('SL',   '판매관리',   'FileText',       '/sl',   7),
  ('PU',   '구매관리',   'ShoppingCart',   '/pu',   8),
  ('QM',   '품질관리',   'ClipboardCheck', '/qm',   9),
  ('RD',   '상품개발',   'CheckCircle',    '/rd',   10),
  ('HA',   '인사·회계',  'People',         '/ha',   11)
) AS m(module_code, module_nm, icon_nm, module_url, sort_order)
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, module_code) DO NOTHING;

-- 2. 메뉴 (송연 메뉴, 분류 안 순서 그대로)
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, md.module_id, NULL, x.menu_code, x.menu_nm, md.module_url || '/' || x.menu_code, NULL, x.sort_order, 'Y', x.menu_dc
FROM tb_tenant t
JOIN (VALUES
  ('DASH', 'dashboard',          '대시보드',          1, NULL),
  ('COMM', 'chat',               '메신저',            1, NULL),
  ('COMM', 'ai-chat',            'AI 분석',           2, NULL),
  ('SA',   'product',            '제품등록',          1, '송연 화면코드 SA0001'),
  ('SA',   'pricing',            '단가관리',          2, '송연 화면코드 SA0002'),
  ('SA',   'quote',              '견적',              3, '송연 화면코드 SA0003'),
  ('SA',   'order',              '수주등록',          4, '송연 화면코드 SA0004'),
  ('SA',   'shipment',           '출하등록',          5, '송연 화면코드 SA0005'),
  ('SA',   'prod-check',         '생산가능확인',      6, '송연 화면코드 SA0006'),
  ('CM',   'settings',           '기초정보',          1, '송연 화면코드 CM0001'),
  ('CM',   'production',         '생산스케줄',        2, '송연 화면코드 CM0002'),
  ('CM',   'logistics',          '물류스케줄',        3, '송연 화면코드 CM0003'),
  ('PD',   'prod-confirm',       '생산확정',          1, '송연 화면코드 PD0001'),
  ('PD',   'actual',             '생산입고',          2, '송연 화면코드 PD0002'),
  ('PD',   'prod-status',        '생산현황',          3, '송연 화면코드 PD0003'),
  ('PD',   'label-print',        '라벨출력',          4, '송연 화면코드 PD0004'),
  ('LG',   'product-stock',      '제품재고관리',      1, '송연 화면코드 LG0001'),
  ('LG',   'ship-confirm',       '출하확정',          2, '송연 화면코드 LG0002'),
  ('LG',   'ship-status',        '출하현황',          3, '송연 화면코드 LG0003'),
  ('SL',   'sales-register',     '판매등록',          1, NULL),
  ('SL',   'sales-status',       '판매현황',          2, NULL),
  ('SL',   'sales-total',        '토탈집계',          3, NULL),
  ('PU',   'po',                 '발주관리',          1, NULL),
  ('PU',   'recv',               '입고관리',          2, NULL),
  ('PU',   'mat-sub',            '재료 치환등록',     3, NULL),
  ('PU',   'purchase',           '수불대장',          4, NULL),
  ('PU',   'stock',              '재고조정',          5, NULL),
  ('PU',   'stock-status',       '재고현황',          6, NULL),
  ('PU',   'documents',          '문서함',            7, NULL),
  ('QM',   'label-register',     '라벨등록',          1, NULL),
  ('QM',   'temp-monitor',       '실시간 온도',       2, NULL),
  ('RD',   'recipe-write',       '레시피 작성',       1, NULL),
  ('RD',   'recipe-share',       '레시피 검색·공유',  2, NULL),
  ('RD',   'recipe-log',         '레시피 공유 로그',  3, NULL),
  ('HA',   'hr',                 '인사관리',          1, NULL),
  ('HA',   'acc-basic',          '기초회계정보',      2, NULL),
  ('HA',   'acc-tx',             '회계거래현황',      3, NULL),
  ('HA',   'acc-in-report',      '입·출금관리',       4, NULL),
  ('HA',   'acc-sales',          '매출·매입관리',     5, NULL),
  ('HA',   'acc-receivable',     '거래처별관리대장',  6, NULL),
  ('HA',   'tax-invoice',        '세금계산서',        7, NULL),
  ('HA',   'delivery-statement', '거래명세표',        8, NULL)
) AS x(module_code, menu_code, menu_nm, sort_order, menu_dc) ON TRUE
JOIN tb_module md ON md.tenant_id = t.tenant_id AND md.module_code = x.module_code
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 3. 메뉴별 기능: 송연 메뉴 전부 × 조회·등록·수정·삭제·엑셀
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t ON t.tenant_id = mn.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_module md ON md.module_id = mn.module_id
  AND md.module_code IN ('DASH', 'COMM', 'SA', 'CM', 'PD', 'LG', 'SL', 'PU', 'QM', 'RD', 'HA')
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL')
ON CONFLICT (menu_id, permission_id) DO NOTHING;

COMMIT;
