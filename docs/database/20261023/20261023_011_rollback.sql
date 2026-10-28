-- 20261023_011_rollback.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 20261023_011 되돌리기 — 백업 표의 값으로 계정 이미지를 처음대로 돌리고 백업 표를 지운다.
-- 주의: 서버가 tb_login_account 이미지를 읽고 쓰므로, 롤백할 때는 내 정보 · 로그인 쿼리도 20261023_011 이전으로 함께 돌린다.
--       적용 뒤 내 정보에서 새로 저장한 이미지도 처음 값으로 돌아간다.

BEGIN;

UPDATE public.tb_login_account la
SET profile_image = b.profile_image,
    stamp_image = b.stamp_image
FROM public.bak_20261023_011_login_images b
WHERE b.login_id = la.login_id;

DROP TABLE IF EXISTS public.bak_20261023_011_login_images;

COMMIT;
