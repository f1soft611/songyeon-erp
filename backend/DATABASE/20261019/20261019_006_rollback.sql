-- 20261019_006_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261019_006 되돌리기 — 백업 표의 줄을 다시 기본창고(default_yn)로 켜고 백업 표를 지운다.
-- 주의
--   - 코드(기본창고 전체 한 곳 규칙)도 함께 되돌려야 한다. 코드는 그대로 두고 자료만 되돌리면 기본창고가 여러 곳이 되어 입고창고가 정렬 첫 줄로 정해진다.
--   - 그 사이 같은 유형에 다른 기본창고를 켰다면 ux_wh_default 에 걸린다. 그 유형은 되돌리지 않고 건너뛴다.

BEGIN;

UPDATE tb_warehouse w
SET default_yn = b.default_yn
FROM bak_20261019_006_warehouse_default b
WHERE w.warehouse_id = b.warehouse_id
  AND w.use_yn = 'Y'
  AND NOT EXISTS (
      SELECT 1 FROM tb_warehouse o
      WHERE o.factory_code = w.factory_code AND o.plant_code = w.plant_code
        AND o.warehouse_type = w.warehouse_type
        AND o.use_yn = 'Y' AND o.default_yn = 'Y'
        AND o.warehouse_id <> w.warehouse_id
  );

DROP TABLE IF EXISTS bak_20261019_006_warehouse_default;

COMMIT;
