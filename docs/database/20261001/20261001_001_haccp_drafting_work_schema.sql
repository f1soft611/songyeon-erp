BEGIN;

CREATE TABLE IF NOT EXISTS public.tb_drafting_work_category_group (
    drafting_work_category_group_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    cata_code VARCHAR(3) NOT NULL,
    cata_name VARCHAR(20) NOT NULL,
    view_seq INTEGER NOT NULL DEFAULT 0,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    delete_status VARCHAR(10) NOT NULL DEFAULT 'N',
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drafting_work_category_group_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_group_created_by
        FOREIGN KEY (created_by) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_group_updated_by
        FOREIGN KEY (updated_by) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT uq_drafting_work_category_group_tenant_code
        UNIQUE (tenant_id, cata_code)
);

CREATE TABLE IF NOT EXISTS public.tb_drafting_work_category (
    drafting_work_category_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    drafting_work_category_group_id BIGINT,
    category_item_id BIGINT,
    cata_type_code VARCHAR(3) NOT NULL,
    code_name VARCHAR(50),
    view_seq INTEGER DEFAULT 0,
    type_cnt TEXT,
    reviewer_id BIGINT,
    approver_id BIGINT,
    user_type VARCHAR(10) DEFAULT '0',
    haccp_cp_status VARCHAR(10),
    reg_term VARCHAR(6),
    reg_term_id BIGINT,
    drafting_work_template_json JSONB,
    drafting_work_template_html TEXT,
    duty_charge_code VARCHAR(10),
    cata_code VARCHAR(3),
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    delete_status VARCHAR(10) DEFAULT 'N',
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drafting_work_category_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_group
        FOREIGN KEY (drafting_work_category_group_id)
        REFERENCES public.tb_drafting_work_category_group(drafting_work_category_group_id) ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_item
        FOREIGN KEY (category_item_id)
        REFERENCES public.tb_common_code_item(common_code_item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_drafting_work_category_reg_term_item
        FOREIGN KEY (reg_term_id)
        REFERENCES public.tb_common_code_item(common_code_item_id) ON DELETE RESTRICT,
    CONSTRAINT fk_drafting_work_category_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_approver
        FOREIGN KEY (approver_id) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_created_by
        FOREIGN KEY (created_by) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_updated_by
        FOREIGN KEY (updated_by) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.tb_drafting_work_category_authority (
    drafting_work_category_authority_id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    drafting_work_category_id BIGINT NOT NULL,
    cata_type_code VARCHAR(3) NOT NULL,
    employee_no VARCHAR(10) NOT NULL,
    use_at CHAR(1) NOT NULL DEFAULT 'Y',
    delete_status VARCHAR(10) NOT NULL DEFAULT 'N',
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drafting_work_category_authority_tenant
        FOREIGN KEY (tenant_id) REFERENCES public.tb_tenant(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_authority_work_category
        FOREIGN KEY (drafting_work_category_id)
        REFERENCES public.tb_drafting_work_category(drafting_work_category_id) ON DELETE CASCADE,
    CONSTRAINT fk_drafting_work_category_authority_created_by
        FOREIGN KEY (created_by) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT fk_drafting_work_category_authority_updated_by
        FOREIGN KEY (updated_by) REFERENCES public.tb_login_account(login_id) ON DELETE SET NULL,
    CONSTRAINT uq_drafting_work_category_authority_mapping
        UNIQUE (tenant_id, drafting_work_category_id, employee_no)
);

CREATE INDEX IF NOT EXISTS idx_drafting_work_category_group_tenant
    ON public.tb_drafting_work_category_group(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_group_use_at
    ON public.tb_drafting_work_category_group(use_at);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_tenant
    ON public.tb_drafting_work_category(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_group_id
    ON public.tb_drafting_work_category(drafting_work_category_group_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_reviewer_id
    ON public.tb_drafting_work_category(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_approver_id
    ON public.tb_drafting_work_category(approver_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_cata_type
    ON public.tb_drafting_work_category(cata_type_code);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_use_at
    ON public.tb_drafting_work_category(use_at);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_category_item_id
    ON public.tb_drafting_work_category(category_item_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_reg_term_id
    ON public.tb_drafting_work_category(reg_term_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_authority_tenant
    ON public.tb_drafting_work_category_authority(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_authority_work_category
    ON public.tb_drafting_work_category_authority(drafting_work_category_id);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_authority_employee_no
    ON public.tb_drafting_work_category_authority(employee_no);
CREATE INDEX IF NOT EXISTS idx_drafting_work_category_authority_use_at
    ON public.tb_drafting_work_category_authority(use_at);

INSERT INTO public.tb_common_code_group (
    tenant_id, group_code, group_nm, group_dc, sort_order, use_at
)
SELECT t.tenant_id, seed.group_code, seed.group_nm, seed.group_dc, seed.sort_order, 'Y'
FROM public.tb_tenant t
CROSS JOIN (
    VALUES
        ('WF_FORM_CATEGORY', '기안양식 분류', '기안양식 분류 공통코드 (20261001_001)', 10),
        ('WF_FORM_CYCLE', '기안양식 등록주기', '기안양식 등록주기 공통코드 (20261001_001)', 20)
) AS seed(group_code, group_nm, group_dc, sort_order)
WHERE t.use_at = 'Y'
ON CONFLICT (tenant_id, group_code) DO NOTHING;

INSERT INTO public.tb_common_code_item (
    tenant_id, group_id, item_code, item_nm, item_dc, sort_order, use_at
)
SELECT g.tenant_id, g.common_code_group_id, seed.item_code, seed.item_nm,
       '기안양식 등록주기 공통코드 (20261001_001)', seed.sort_order, 'Y'
FROM public.tb_common_code_group g
JOIN public.tb_tenant t ON t.tenant_id = g.tenant_id AND t.use_at = 'Y'
JOIN (
    VALUES
        ('WF_FORM_CYCLE', 'DAY', '일', 10),
        ('WF_FORM_CYCLE', 'WEEK', '주', 20),
        ('WF_FORM_CYCLE', 'MONTH', '월', 30),
        ('WF_FORM_CYCLE', 'EVENT', '발생시', 40)
) AS seed(group_code, item_code, item_nm, sort_order)
  ON seed.group_code = g.group_code
WHERE g.use_at = 'Y'
ON CONFLICT (group_id, item_code) DO NOTHING;

COMMIT;