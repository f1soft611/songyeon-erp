-- 20261019_003_migrate_packing_vehicle_to_common_code.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 기초정보의 포장방법(packing_methods) · 차량정보(vehicles) 탭과 그 코드를 지우고, 출하확정의 포장방법 · 차량 목록을 공통코드로 옮긴다.
--   1) 공통코드 그룹 '차량'(VEHICLE)을 만든다. 포장방법 그룹 PACKING_TYPE 은 20261016_007 에서 만들었다.
--   2) packing_methods → PACKING_TYPE, vehicles → VEHICLE 상세코드로 옮긴다.
--      - 상세코드는 원래 id 순서로 001, 002 … 를 매긴다.
--      - 같은 이름이 이미 있으면 넣지 않는다.
--   3) 공통코드 관리 화면의 상세코드 자동 번호(tb_id_sequence, COMMON_CODE_ITEM_CODE · 그룹 id)를 넣은 최댓값까지 올린다.
--      그래야 화면에서 이어 넣어도 번호가 겹치지 않는다.
-- 옛 표(packing_methods · vehicles)는 지우지 않는다. 출하확정이 저장한 포장방법 · 차량 값은 이름(글자)이라 그대로 맞는다.
-- 되돌리기용으로 이 작업이 넣은 상세코드 id 와 새로 만든 그룹 id 를 bak_20261019_003_common_code 에 남긴다.

BEGIN;

CREATE TABLE IF NOT EXISTS bak_20261019_003_common_code (
    kind         VARCHAR(10) NOT NULL,   -- 'group' 또는 'item'
    target_id    BIGINT      NOT NULL,
    backed_up_at TIMESTAMP   NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, target_id)
);

-- 1) 차량 그룹
WITH g AS (
    INSERT INTO tb_common_code_group (tenant_id, group_code, group_nm, group_dc, parent_group_id, sort_order, use_at, created_by, updated_by)
    SELECT t.tenant_id, 'VEHICLE', '차량', NULL, NULL, 2, 'Y', NULL, NULL
    FROM tb_tenant t
    WHERE t.tenant_code = 'SONGYEON'
    ON CONFLICT (tenant_id, group_code) DO NOTHING
    RETURNING common_code_group_id
)
INSERT INTO bak_20261019_003_common_code (kind, target_id)
SELECT 'group', common_code_group_id FROM g
ON CONFLICT DO NOTHING;

-- 2) 상세코드 옮기기 (그룹 안에서 이미 쓴 숫자 코드 다음부터)
WITH src AS (
    SELECT 'PACKING_TYPE'::text AS group_code, p.id AS src_id, p.name FROM packing_methods p WHERE COALESCE(p.name, '') <> ''
    UNION ALL
    SELECT 'VEHICLE', v.id, v.name FROM vehicles v WHERE COALESCE(v.name, '') <> ''
),
grp AS (
    SELECT g.common_code_group_id AS group_id, g.tenant_id, g.group_code,
           COALESCE((SELECT MAX(i.item_code::bigint) FROM tb_common_code_item i
                     WHERE i.group_id = g.common_code_group_id AND i.item_code ~ '^[0-9]{1,18}$'), 0) AS last_code,
           COALESCE((SELECT MAX(i.sort_order) FROM tb_common_code_item i WHERE i.group_id = g.common_code_group_id), 0) AS last_sort
    FROM tb_common_code_group g
    JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
    WHERE g.group_code IN ('PACKING_TYPE', 'VEHICLE')
),
todo AS (
    SELECT grp.group_id, grp.tenant_id, src.name,
           grp.last_code + ROW_NUMBER() OVER (PARTITION BY grp.group_id ORDER BY src.src_id) AS n,
           grp.last_sort + ROW_NUMBER() OVER (PARTITION BY grp.group_id ORDER BY src.src_id) AS s
    FROM src
    JOIN grp ON grp.group_code = src.group_code
    WHERE NOT EXISTS (SELECT 1 FROM tb_common_code_item i WHERE i.group_id = grp.group_id AND i.item_nm = src.name)
),
ins AS (
    INSERT INTO tb_common_code_item (tenant_id, group_id, item_code, item_nm, item_dc, parent_item_id, sort_order, use_at, created_by, updated_by)
    SELECT tenant_id, group_id, LPAD(n::text, 3, '0'), name, NULL, NULL, s, 'Y', NULL, NULL
    FROM todo
    ON CONFLICT (group_id, item_code) DO NOTHING
    RETURNING common_code_item_id
)
INSERT INTO bak_20261019_003_common_code (kind, target_id)
SELECT 'item', common_code_item_id FROM ins
ON CONFLICT DO NOTHING;

-- 3) 자동 번호 카운터를 숫자 코드 최댓값까지 (S_ERP 20261002_003 과 같은 방식)
INSERT INTO tb_id_sequence (generator_key, scope_key_1, scope_key_2, last_issued_value)
SELECT 'COMMON_CODE_ITEM_CODE', i.group_id::varchar, '', MAX(i.item_code::bigint)
FROM tb_common_code_item i
JOIN tb_common_code_group g ON g.common_code_group_id = i.group_id
JOIN tb_tenant t ON t.tenant_id = g.tenant_id AND t.tenant_code = 'SONGYEON'
WHERE g.group_code IN ('PACKING_TYPE', 'VEHICLE')
  AND i.item_code ~ '^[0-9]{1,18}$'
GROUP BY i.group_id
ON CONFLICT (generator_key, scope_key_1, scope_key_2) DO UPDATE
SET last_issued_value = GREATEST(tb_id_sequence.last_issued_value, EXCLUDED.last_issued_value),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
