-- 20261019_006_keep_single_default_warehouse.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 기본창고를 전체에서 한 곳만 둔다(2026-10-19 사용자 결정: "기본창고도 하나만 선택되어야 하고", 원자재 기본만 남김).
--       기본창고 = 입고창고. 사업장 · 사업부마다 사용 중인 기본창고 가운데 원자재 → 정렬순서 → id 순으로 첫 한 곳만 남기고 나머지는 끈다.
-- 표 정의는 바꾸지 않는다(설계자 표의 ux_wh_default 는 유형마다 한 곳까지 허용한다. 전체 한 곳은 서비스가 지킨다).
-- 감사 칸(upd_dt · upd_user_id)은 건드리지 않는다(사용자가 고친 것이 아니라 자료 정리).
-- 바꾸기 전 값은 백업 표 bak_20261019_006_warehouse_default 에 남긴다. 다시 돌려도 결과가 같다.

BEGIN;

CREATE TABLE IF NOT EXISTS bak_20261019_006_warehouse_default (
    warehouse_id BIGINT  PRIMARY KEY,
    default_yn   CHAR(1) NOT NULL,
    backup_dt    TIMESTAMP NOT NULL DEFAULT NOW()
);

WITH keep AS (
    SELECT DISTINCT ON (factory_code, plant_code) warehouse_id
    FROM tb_warehouse
    WHERE use_yn = 'Y' AND default_yn = 'Y'
    ORDER BY factory_code, plant_code, (warehouse_type = '원자재') DESC, sort_seq, warehouse_id
)
INSERT INTO bak_20261019_006_warehouse_default (warehouse_id, default_yn)
SELECT w.warehouse_id, w.default_yn
FROM tb_warehouse w
WHERE w.use_yn = 'Y' AND w.default_yn = 'Y'
  AND w.warehouse_id NOT IN (SELECT warehouse_id FROM keep)
ON CONFLICT (warehouse_id) DO NOTHING;

WITH keep AS (
    SELECT DISTINCT ON (factory_code, plant_code) warehouse_id
    FROM tb_warehouse
    WHERE use_yn = 'Y' AND default_yn = 'Y'
    ORDER BY factory_code, plant_code, (warehouse_type = '원자재') DESC, sort_seq, warehouse_id
)
UPDATE tb_warehouse w
SET default_yn = 'N'
WHERE w.use_yn = 'Y' AND w.default_yn = 'Y'
  AND w.warehouse_id NOT IN (SELECT warehouse_id FROM keep);

COMMIT;
