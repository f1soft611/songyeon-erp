-- 20261022_002_restore_messenger_ai_module_order.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: (2026-10-22 요청 "기존 파이썬 확인해서 AI 넣어주고 순서도 맞춰줘")
--   1) 모듈관리 화면에서 지워진 메신저·AI(COMM) 모듈과 그 메뉴 2개(메신저 · AI 분석)를 처음 넣을 때(20261002_002 · 003) 값 그대로 되살린다.
--      메뉴 권한 정의(조회 · 등록 · 수정 · 삭제 · 엑셀)와 시스템 관리자(ADMIN) 역할 권한도 다시 붙인다(20261021_001 과 같은 규칙).
--   2) 왼쪽 모듈 순서를 송연 파이썬 원본(MES 프로토타입 사이드바 data-block-id 순서, 송연 navigation.ts 와 같음)에 맞춘다.
--      대시보드 · 메신저·AI · 영업관리 · 공통관리 · 생산관리 · 물류관리 · 판매관리 · 구매관리 · 품질관리 · 상품개발 · 인사·회계, 맨 뒤 환경설정(S_ERP)
--   - 적용 전 모듈 순서는 bak_20261022_002_module_order 에 남긴다(롤백용).
-- 다시 돌려도 결과가 같다.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tb_tenant WHERE tenant_code = 'SONGYEON') THEN
        RAISE EXCEPTION 'SONGYEON 테넌트가 없습니다';
    END IF;
END $$;

-- 0) 롤백용: 적용 전 모듈 순서 · 메신저·AI 가 있었는지(처음 한 번만 만든다)
CREATE TABLE IF NOT EXISTS bak_20261022_002_module_order AS
SELECT mo.module_code, mo.sort_order
FROM tb_module mo
JOIN tb_tenant t ON t.tenant_id = mo.tenant_id AND t.tenant_code = 'SONGYEON';

-- 1) 메신저·AI 모듈
INSERT INTO tb_module (tenant_id, module_code, module_nm, icon_nm, module_url, sort_order, use_at)
SELECT t.tenant_id, 'COMM', '메신저·AI', 'Notifications', '/comm', 20, 'Y'
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, module_code) DO NOTHING;

-- 2) 메뉴 2개(화면 키 chat · ai-chat 은 그대로라 화면 코드와 이어진다)
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT md.tenant_id, md.module_id, NULL, x.menu_code, x.menu_nm, md.module_url || '/' || x.menu_code, NULL, x.sort_order, 'Y', x.menu_dc
FROM tb_module md
JOIN tb_tenant t ON t.tenant_id = md.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN (VALUES
  ('chat',    '메신저',  1, '사내 직원들과 1:1 또는 단체로 대화할 수 있어요'),
  ('ai-chat', 'AI 분석', 2, '수요예측·재고경고와 AI 챗봇을 한 화면에서 확인하고 물어볼 수 있어요')
) AS x(menu_code, menu_nm, sort_order, menu_dc) ON TRUE
WHERE md.module_code = 'COMM'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;

-- 3) 메뉴 권한 정의: 조회 · 등록 · 수정 · 삭제 · 엑셀
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_module md ON md.module_id = mn.module_id AND md.module_code = 'COMM'
JOIN tb_tenant t ON t.tenant_id = md.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_permission pm ON pm.permission_code IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXCEL')
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 4) 시스템 관리자(ADMIN) 역할 권한
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mp.menu_id, mp.permission_id
FROM tb_menu_permission mp
JOIN tb_menu mn ON mn.menu_id = mp.menu_id
JOIN tb_module md ON md.module_id = mn.module_id AND md.module_code = 'COMM'
JOIN tb_role r ON r.tenant_id = md.tenant_id AND r.role_code = 'ADMIN'
JOIN tb_tenant t ON t.tenant_id = md.tenant_id AND t.tenant_code = 'SONGYEON'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;

-- 5) 모듈 순서(송연 파이썬 원본 사이드바 순서, 환경설정은 맨 뒤)
UPDATE tb_module mo
SET sort_order = o.sort_order, updated_at = now()
FROM tb_tenant t, (VALUES
  ('DASH', 10), ('COMM', 20), ('SA', 30), ('CO', 40), ('PD', 50), ('LG', 60),
  ('SL', 70), ('PU', 80), ('QM', 90), ('RD', 100), ('HA', 110), ('SETTINGS', 120)
) AS o(module_code, sort_order)
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = o.module_code
  AND mo.sort_order <> o.sort_order;

COMMIT;
