-- 20261019_013_remove_co_basic_info_menu.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 > 기초정보(분류 master) 아래 '기초정보' 화면(menu_code settings, 송연 CM0001)을 메뉴에서 지운다.
--       탭은 모두 화면으로 뺐다(포장유형 · 창고등록 · 제품마스터 · 거래처마스터 · 거래처별 제품조회 · 원재료마스터 · 부자재마스터).
--       남은 서버관리 탭은 쓰지 않기로 했다(2026-10-19 사용자). 포장방법 · 차량정보 탭은 앞서 지웠다.
-- 지우기 전 메뉴 · 권한 행은 백업 표 bak_20261019_013_* 에 남긴다(롤백이 쓴다). 다시 돌려도 결과가 같다.
-- 앞선 작업: 20261019_004 · 008 ~ 012 (새 화면 메뉴들이 이 메뉴의 권한 행을 복사했다. 그 파일들은 이 파일보다 먼저 돌린다)

BEGIN;

CREATE TABLE IF NOT EXISTS bak_20261019_013_menu AS
SELECT m.* FROM tb_menu m WHERE FALSE;
CREATE TABLE IF NOT EXISTS bak_20261019_013_menu_permission AS
SELECT mp.* FROM tb_menu_permission mp WHERE FALSE;
CREATE TABLE IF NOT EXISTS bak_20261019_013_role_menu_permission AS
SELECT rp.* FROM tb_role_menu_permission rp WHERE FALSE;

INSERT INTO bak_20261019_013_menu
SELECT m.*
FROM tb_menu m
JOIN tb_tenant t ON t.tenant_id = m.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN tb_menu p ON p.menu_id = m.parent_menu_id AND p.menu_code = 'master'
WHERE m.menu_code = 'settings'
  AND NOT EXISTS (SELECT 1 FROM bak_20261019_013_menu b WHERE b.menu_id = m.menu_id);

INSERT INTO bak_20261019_013_menu_permission
SELECT mp.*
FROM tb_menu_permission mp
JOIN bak_20261019_013_menu b ON b.menu_id = mp.menu_id
WHERE NOT EXISTS (
    SELECT 1 FROM bak_20261019_013_menu_permission x
    WHERE x.menu_id = mp.menu_id AND x.permission_id = mp.permission_id
);

INSERT INTO bak_20261019_013_role_menu_permission
SELECT rp.*
FROM tb_role_menu_permission rp
JOIN bak_20261019_013_menu b ON b.menu_id = rp.menu_id
WHERE NOT EXISTS (
    SELECT 1 FROM bak_20261019_013_role_menu_permission x
    WHERE x.role_id = rp.role_id AND x.menu_id = rp.menu_id AND x.permission_id = rp.permission_id
);

DELETE FROM tb_role_menu_permission rp USING bak_20261019_013_menu b WHERE rp.menu_id = b.menu_id;
DELETE FROM tb_menu_permission mp USING bak_20261019_013_menu b WHERE mp.menu_id = b.menu_id;
DELETE FROM tb_menu m USING bak_20261019_013_menu b WHERE m.menu_id = b.menu_id;

COMMIT;
