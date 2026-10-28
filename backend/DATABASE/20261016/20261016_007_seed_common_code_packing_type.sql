-- 20261016_007_seed_common_code_packing_type.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통코드 그룹 '포장방법'(PACKING_TYPE)을 SONGYEON 테넌트에 만든다. 상세코드는 넣지 않는다(공통코드 관리 화면에서 넣는다).
-- 값은 공통코드 관리 화면이 새 그룹을 저장할 때(CommonCodeGroupDAO.insertGroup)와 같게 둔다: 설명 · 상위 그룹 비움, 사용 Y, 작성자 비움.

BEGIN;

INSERT INTO tb_common_code_group (tenant_id, group_code, group_nm, group_dc, parent_group_id, sort_order, use_at, created_by, updated_by)
SELECT t.tenant_id, 'PACKING_TYPE', '포장방법', NULL, NULL, 1, 'Y', NULL, NULL
FROM tb_tenant t
WHERE t.tenant_code = 'SONGYEON'
ON CONFLICT (tenant_id, group_code) DO NOTHING;

COMMIT;
