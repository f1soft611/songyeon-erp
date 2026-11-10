-- 20261104_003 롤백: 메뉴 즐겨찾기 표를 지운다(저장한 즐겨찾기 · 폴더도 함께 지워진다)
BEGIN;

DROP TABLE IF EXISTS public.tb_user_menu_favorite;
DROP TABLE IF EXISTS public.tb_user_menu_favorite_folder;

COMMIT;
