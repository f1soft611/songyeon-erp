-- 20261019_016_rename_co_schedule_screen_ids.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 공통관리 > 스케줄관리의 두 화면 화면ID(menu_code = 주소 마지막 칸)를 기초정보 화면들처럼 바꾼다.
--   - 규칙: 분류 글자(스케줄관리 = SC) + 화면 뜻(영어) + View  (기초정보는 BS…View)
--   - production → SCProductionScheduleView  (/co/schedule/production → /co/schedule/SCProductionScheduleView)
--   - logistics  → SCLogisticsScheduleView   (/co/schedule/logistics  → /co/schedule/SCLogisticsScheduleView)
--   - 메뉴 번호 · 이름 · 순서 · 권한 행은 그대로다. 현장 TV 화면 주소(/tv/production · /tv/logistics)는 메뉴가 아니라 바뀌지 않는다.
-- 앞선 작업: 20261019_015 (스케줄관리 분류). 다시 돌려도 결과가 같다.

BEGIN;

UPDATE tb_menu m
SET menu_code = v.new_code,
    menu_url = '/co/schedule/' || v.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM tb_tenant t,
     (VALUES ('production', 'SCProductionScheduleView'),
             ('logistics',  'SCLogisticsScheduleView')) AS v(old_code, new_code)
WHERE t.tenant_code = 'SONGYEON'
  AND m.tenant_id = t.tenant_id
  AND m.menu_code = v.old_code
  AND NOT EXISTS (SELECT 1 FROM tb_menu x WHERE x.tenant_id = t.tenant_id AND x.menu_code = v.new_code);

COMMIT;
