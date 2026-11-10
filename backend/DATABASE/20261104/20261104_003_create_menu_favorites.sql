-- 20261104_003 메뉴 즐겨찾기(폴더 · 즐겨찾기) 만들기
-- S_ERP 20261102_001(tb_user_menu_favorite_folder · tb_user_menu_favorite) · 20261102_002(favorite_nm)과 같은 구조다.
-- 다른 점: 사람 칸 user_id 는 송연 사번(varchar(20), employees.id)이다(20261103_003 사번 통일).
-- 다시 적용해도 같다(IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS public.tb_user_menu_favorite_folder (
    favorite_folder_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    folder_nm VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_menu_favorite_folder_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_folder_user
        FOREIGN KEY (user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_menu_favorite_folder_owner
        UNIQUE (favorite_folder_id, tenant_id, user_id),
    CONSTRAINT chk_user_menu_favorite_folder_name
        CHECK (LENGTH(BTRIM(folder_nm)) BETWEEN 1 AND 40)
);

COMMENT ON TABLE public.tb_user_menu_favorite_folder IS '사용자별 메뉴 즐겨찾기 폴더';
COMMENT ON COLUMN public.tb_user_menu_favorite_folder.user_id IS '주인 사번(employees.id)';

CREATE INDEX IF NOT EXISTS idx_user_menu_favorite_folder_owner
    ON public.tb_user_menu_favorite_folder (tenant_id, user_id, favorite_folder_id);

CREATE TABLE IF NOT EXISTS public.tb_user_menu_favorite (
    favorite_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    menu_id BIGINT NOT NULL,
    favorite_folder_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    favorite_nm VARCHAR(100),
    CONSTRAINT fk_user_menu_favorite_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant (tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_user
        FOREIGN KEY (user_id) REFERENCES public.employees (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_menu
        FOREIGN KEY (menu_id) REFERENCES public.tb_menu (menu_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_menu_favorite_folder_owner
        FOREIGN KEY (favorite_folder_id, tenant_id, user_id)
        REFERENCES public.tb_user_menu_favorite_folder (favorite_folder_id, tenant_id, user_id),
    CONSTRAINT uq_user_menu_favorite_menu
        UNIQUE (tenant_id, user_id, menu_id)
);

COMMENT ON TABLE public.tb_user_menu_favorite IS '사용자별 메뉴 즐겨찾기(폴더 없으면 맨 위, 같은 메뉴는 한 번)';
COMMENT ON COLUMN public.tb_user_menu_favorite.favorite_nm IS '즐겨찾기에 보일 이름(없으면 메뉴 이름)';

CREATE INDEX IF NOT EXISTS idx_user_menu_favorite_owner_location
    ON public.tb_user_menu_favorite (tenant_id, user_id, favorite_folder_id, favorite_id);

COMMIT;
