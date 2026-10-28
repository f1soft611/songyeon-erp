-- 20261022_002_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261022_002 되돌리기 — 모듈 순서를 적용 전으로, 적용 전에 없던 메신저·AI 모듈을 다시 지운다.
-- 주의: 메신저·AI 모듈을 지우면 그 메뉴 · 메뉴 권한 · 역할 권한도 FK CASCADE 로 함께 지워진다(적용 전 상태와 같음).

BEGIN;

DO $$
BEGIN
    IF to_regclass('bak_20261022_002_module_order') IS NULL THEN
        RAISE EXCEPTION '백업 표 bak_20261022_002_module_order 가 없습니다';
    END IF;
END $$;

-- 적용 전에 없던 메신저·AI 모듈만 지운다
DELETE FROM tb_module mo
USING tb_tenant t
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND mo.module_code = 'COMM'
  AND NOT EXISTS (SELECT 1 FROM bak_20261022_002_module_order b WHERE b.module_code = 'COMM');

UPDATE tb_module mo
SET sort_order = b.sort_order, updated_at = now()
FROM tb_tenant t, bak_20261022_002_module_order b
WHERE t.tenant_id = mo.tenant_id
  AND t.tenant_code = 'SONGYEON'
  AND b.module_code = mo.module_code
  AND mo.sort_order <> b.sort_order;

DROP TABLE bak_20261022_002_module_order;

COMMIT;
