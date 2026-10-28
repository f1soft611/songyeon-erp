ALTER TABLE tb_user
    DROP CONSTRAINT IF EXISTS fk_tb_user_level;

ALTER TABLE tb_user
    DROP COLUMN IF EXISTS level_id;
