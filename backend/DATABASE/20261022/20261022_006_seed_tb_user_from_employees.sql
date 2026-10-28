-- 20261022_006_seed_tb_user_from_employees.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 그룹웨어 전자결재 이관(작업지시서 20261022_007 4단계 '가') — 송연 로그인 계정마다 S_ERP 사용자 표(tb_user) 줄을 만든다.
--   S_ERP 결재 코드는 로그인 uniqId = tb_user.user_id 로 사람을 찾는다. 송연 로그인도 이 값을 쓰게 바꾼다(계획 · 사양서 20261022_008 3절).
--   - login_id: 계정(tb_login_account, login_code = 사번) 연결
--   - user_nm: 사원 이름, email_addr: 사원 이메일(비었거나 다른 사용자와 겹치면 NULL — (tenant_id, email_addr) UNIQUE)
--   - use_at: 퇴사일이 있으면 N
--   - department_id · level_id: 비움(S_ERP DB 도 부서 0건 · 직급 비어 있음)
--   이후 새 사원은 인사관리 등록 때 서비스가 같은 규칙으로 만든다(HrDAO.insertUserIfMissing).
-- 이미 tb_user 가 있는 계정은 건너뛴다. 다시 돌려도 결과가 같다.

BEGIN;

INSERT INTO tb_user (tenant_id, login_id, user_nm, email_addr, use_at)
SELECT la.tenant_id,
       la.login_id,
       e.name,
       CASE
           WHEN NULLIF(BTRIM(e.email), '') IS NULL THEN NULL
           WHEN EXISTS (SELECT 1 FROM tb_user u2 WHERE u2.tenant_id = la.tenant_id AND u2.email_addr = BTRIM(e.email)) THEN NULL
           WHEN (SELECT count(*) FROM employees e2 JOIN tb_login_account la2 ON la2.login_code = e2.id AND la2.tenant_id = la.tenant_id
                  WHERE BTRIM(e2.email) = BTRIM(e.email)) > 1 THEN NULL
           ELSE BTRIM(e.email)
       END,
       CASE WHEN NULLIF(BTRIM(e.resign_date), '') IS NULL THEN 'Y' ELSE 'N' END
FROM tb_login_account la
JOIN tb_tenant t ON t.tenant_id = la.tenant_id AND t.tenant_code = 'SONGYEON'
JOIN employees e ON e.id = la.login_code
WHERE NOT EXISTS (SELECT 1 FROM tb_user u WHERE u.tenant_id = la.tenant_id AND u.login_id = la.login_id);

COMMIT;
