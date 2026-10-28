ALTER TABLE tb_user
    ADD COLUMN level_id BIGINT NULL;

ALTER TABLE tb_user
    ADD CONSTRAINT fk_tb_user_level
    FOREIGN KEY (level_id)
    REFERENCES tb_common_code_item (common_code_item_id)
    ON DELETE RESTRICT;
