-- 20261023_011_move_profile_images_to_login_account.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 전자결재 도장이 안 보이는 문제(2026-10-23 "내가 방금 문서작성에서 승인했는데 도장이 안보여")
--   내 정보 관리는 프로필 · 도장 이미지를 employees 에 저장했는데,
--   전자결재 결재선 · 공지 · 댓글 · 기안양식 사용자 목록은 S_ERP 처럼 tb_login_account 에서 읽는다.
--   S_ERP 와 같이 이미지는 계정 표(tb_login_account.profile_image · stamp_image)에 두기로 하고,
--   지금 employees 에 있는 이미지를 같은 사번(login_code = employees.id)의 계정으로 옮겨 적는다.
--   - 계정에 이미 이미지가 있으면 덮어쓰지 않는다.
--   - 롤백이 정확하도록 바꾸기 전 계정 값을 bak_20261023_011_login_images 에 남긴다.
--   - employees 의 이미지 칸은 지우지 않는다(서버가 더는 읽고 쓰지 않는다).
-- 다시 돌려도 결과가 같다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.bak_20261023_011_login_images (
    login_id      bigint PRIMARY KEY,
    profile_image text,
    stamp_image   text
);

INSERT INTO public.bak_20261023_011_login_images (login_id, profile_image, stamp_image)
SELECT la.login_id, la.profile_image, la.stamp_image
FROM public.tb_login_account la
JOIN public.employees e ON e.id = la.login_code
WHERE (NULLIF(e.profile_image, '') IS NOT NULL AND NULLIF(la.profile_image, '') IS NULL)
   OR (NULLIF(e.stamp_image, '') IS NOT NULL AND NULLIF(la.stamp_image, '') IS NULL)
ON CONFLICT (login_id) DO NOTHING;

UPDATE public.tb_login_account la
SET profile_image = COALESCE(NULLIF(la.profile_image, ''), NULLIF(e.profile_image, '')),
    stamp_image = COALESCE(NULLIF(la.stamp_image, ''), NULLIF(e.stamp_image, ''))
FROM public.employees e
WHERE e.id = la.login_code
  AND ((NULLIF(e.profile_image, '') IS NOT NULL AND NULLIF(la.profile_image, '') IS NULL)
    OR (NULLIF(e.stamp_image, '') IS NOT NULL AND NULLIF(la.stamp_image, '') IS NULL));

COMMIT;
