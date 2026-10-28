-- 20261019_003_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_003 되돌리기 — 이 작업이 넣은 상세코드와 새로 만든 '차량'(VEHICLE) 그룹을 지운다.
-- 그 사이 화면에서 더 넣은 상세코드가 있으면 그룹은 남긴다(그 자료를 잃지 않게). 번호표는 남은 상세코드 기준으로 맞춘다.
-- 주의: 코드(출하확정 목록 · 지운 기초정보 탭)도 함께 되돌려야 한다.

BEGIN;

DELETE FROM tb_common_code_item i
USING bak_20261019_003_common_code k
WHERE k.kind = 'item' AND k.target_id = i.common_code_item_id;

DELETE FROM tb_common_code_group g
USING bak_20261019_003_common_code k
WHERE k.kind = 'group' AND k.target_id = g.common_code_group_id
  AND NOT EXISTS (SELECT 1 FROM tb_common_code_item i WHERE i.group_id = g.common_code_group_id)
  AND NOT EXISTS (SELECT 1 FROM tb_common_code_group c WHERE c.parent_group_id = g.common_code_group_id);

-- 번호표: 남은 숫자 코드 최댓값으로(남은 것이 없으면 그 줄을 지운다)
UPDATE tb_id_sequence s
SET last_issued_value = COALESCE((SELECT MAX(i.item_code::bigint) FROM tb_common_code_item i
                                  WHERE i.group_id::varchar = s.scope_key_1 AND i.item_code ~ '^[0-9]{1,18}$'), 0),
    updated_at = CURRENT_TIMESTAMP
WHERE s.generator_key = 'COMMON_CODE_ITEM_CODE'
  AND s.scope_key_1 IN (SELECT g.common_code_group_id::varchar FROM tb_common_code_group g WHERE g.group_code IN ('PACKING_TYPE', 'VEHICLE'));

DELETE FROM tb_id_sequence s
WHERE s.generator_key = 'COMMON_CODE_ITEM_CODE'
  AND NOT EXISTS (SELECT 1 FROM tb_common_code_group g WHERE g.common_code_group_id::varchar = s.scope_key_1);

DROP TABLE IF EXISTS bak_20261019_003_common_code;

COMMIT;
