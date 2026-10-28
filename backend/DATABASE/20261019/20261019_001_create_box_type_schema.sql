-- 20261019_001_create_box_type_schema.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 포장유형 마스터 tb_box_type (공통관리 > 기초정보 > 포장유형, 화면ID BSBoxTypeView)
-- 원본: 테이블 설계자 스크립트(작성일 2026-10-15). DB 에는 2026-10-19 에 그 스크립트로 직접 적용됐다.
-- 이 파일은 기록용이며 다시 돌려도 안전하게 바꿨다.
--   - 원본 맨 앞의 'DROP TABLE IF EXISTS tb_box_type CASCADE' 는 뺐다(다시 돌리면 자료가 지워진다). 표를 지우는 것은 롤백 파일에만 둔다.
--   - CREATE TABLE / INDEX 는 IF NOT EXISTS, 트리거는 DROP TRIGGER IF EXISTS 뒤에 만든다.
--   - 표 정의(칸 · 형 · 기본값 · 제약 · 인덱스 · 설명)는 원본과 같다.
-- 운영 규칙(2026-10-19 확인): 사업장 F001 · 사업부 P001 고정, 적용기간(apply_start_dt · apply_end_dt)은 관리하지 않음(기본값 그대로, 수정은 그 줄을 덮어쓴다).

BEGIN;

CREATE TABLE IF NOT EXISTS tb_box_type (
    box_type_id            BIGSERIAL     NOT NULL,
    factory_code           VARCHAR(10)   NOT NULL,
    plant_code             VARCHAR(10)   NOT NULL,

    box_type_cd            VARCHAR(20)   NOT NULL,
    box_type_nm            VARCHAR(50)   NOT NULL,

    pack_qty               NUMERIC(15,3),
    pack_unit              VARCHAR(10),

    fixed_margin_rate      NUMERIC(7,3)  NOT NULL DEFAULT 0,
    loss_rate              NUMERIC(7,3)  NOT NULL DEFAULT 0,
    labor_cost             NUMERIC(15,2) NOT NULL DEFAULT 0,
    packing_cost           NUMERIC(15,2) NOT NULL DEFAULT 0,
    logistics_cost         NUMERIC(15,2) NOT NULL DEFAULT 0,
    margin_amt             NUMERIC(15,2) NOT NULL DEFAULT 0,

    total_cost             NUMERIC(15,2)
        GENERATED ALWAYS AS (labor_cost + packing_cost + logistics_cost) STORED,

    apply_start_dt         DATE          NOT NULL DEFAULT CURRENT_DATE,
    apply_end_dt           DATE          NOT NULL DEFAULT DATE '9999-12-31',

    sort_seq               INT           DEFAULT 0,
    remark                 VARCHAR(300),
    use_yn                 CHAR(1)       NOT NULL DEFAULT 'Y',

    reg_dt                 TIMESTAMP     NOT NULL DEFAULT now(),
    reg_user_id            VARCHAR(20),
    upd_dt                 TIMESTAMP,
    upd_user_id            VARCHAR(20),

    CONSTRAINT pk_box_type              PRIMARY KEY (box_type_id),
    CONSTRAINT uq_box_type              UNIQUE (factory_code, plant_code, box_type_cd, apply_start_dt),
    CONSTRAINT ck_box_type_use          CHECK (use_yn IN ('Y','N')),
    CONSTRAINT ck_box_type_margin_rate  CHECK (fixed_margin_rate >= 0 AND fixed_margin_rate <= 100),
    CONSTRAINT ck_box_type_loss_rate    CHECK (loss_rate        >= 0 AND loss_rate        <= 100),
    CONSTRAINT ck_box_type_labor        CHECK (labor_cost       >= 0),
    CONSTRAINT ck_box_type_packing      CHECK (packing_cost     >= 0),
    CONSTRAINT ck_box_type_logistics    CHECK (logistics_cost   >= 0),
    CONSTRAINT ck_box_type_margin_amt   CHECK (margin_amt       >= 0),
    CONSTRAINT ck_box_type_pack_qty     CHECK (pack_qty IS NULL OR pack_qty > 0),
    CONSTRAINT ck_box_type_apply_period CHECK (apply_end_dt >= apply_start_dt)
);

CREATE INDEX IF NOT EXISTS ix_box_type_site  ON tb_box_type(factory_code, plant_code);
CREATE INDEX IF NOT EXISTS ix_box_type_nm    ON tb_box_type(box_type_nm);
CREATE INDEX IF NOT EXISTS ix_box_type_use   ON tb_box_type(use_yn, sort_seq);
CREATE INDEX IF NOT EXISTS ix_box_type_apply ON tb_box_type(apply_start_dt, apply_end_dt);

COMMENT ON TABLE  tb_box_type                    IS '포장유형마스터(포장유형별 원가/마진 구성 기준정보)';
COMMENT ON COLUMN tb_box_type.box_type_id        IS '일련번호(PK, 자동채번, 서로게이트키)';
COMMENT ON COLUMN tb_box_type.factory_code       IS '사업장코드';
COMMENT ON COLUMN tb_box_type.plant_code         IS '사업부코드';
COMMENT ON COLUMN tb_box_type.box_type_cd        IS '포장유형코드 [UNIQUE 구성요소]';
COMMENT ON COLUMN tb_box_type.box_type_nm        IS '포장유형명(예: 소포장 5kg, 소포장 500g)';
COMMENT ON COLUMN tb_box_type.pack_qty           IS '포장단위 수량';
COMMENT ON COLUMN tb_box_type.pack_unit          IS '포장단위(KG/G/EA 등)';
COMMENT ON COLUMN tb_box_type.fixed_margin_rate  IS '고정마진율(%) - 0~100';
COMMENT ON COLUMN tb_box_type.loss_rate          IS '로스율(%) - 0~100';
COMMENT ON COLUMN tb_box_type.labor_cost         IS '인건비(원)';
COMMENT ON COLUMN tb_box_type.packing_cost       IS '포장비(원)';
COMMENT ON COLUMN tb_box_type.logistics_cost     IS '물류비(원)';
COMMENT ON COLUMN tb_box_type.margin_amt         IS '마진(원) - 고정 마진금액';
COMMENT ON COLUMN tb_box_type.total_cost         IS '부대비용 합계(원) = 인건비+포장비+물류비 (자동계산)';
COMMENT ON COLUMN tb_box_type.apply_start_dt     IS '적용시작일자 [UNIQUE 구성요소]';
COMMENT ON COLUMN tb_box_type.apply_end_dt       IS '적용종료일자(미지정 시 9999-12-31)';
COMMENT ON COLUMN tb_box_type.sort_seq           IS '정렬순서(그리드 표시순)';
COMMENT ON COLUMN tb_box_type.remark             IS '비고';
COMMENT ON COLUMN tb_box_type.use_yn             IS '사용여부(Y/N)';
COMMENT ON COLUMN tb_box_type.reg_dt             IS '등록일시';
COMMENT ON COLUMN tb_box_type.reg_user_id        IS '등록자ID';
COMMENT ON COLUMN tb_box_type.upd_dt             IS '수정일시';
COMMENT ON COLUMN tb_box_type.upd_user_id        IS '수정자ID';

-- 수정일시 자동 갱신 트리거(지금은 이 표만 쓴다)
CREATE OR REPLACE FUNCTION fn_set_upd_dt() RETURNS TRIGGER AS $$
BEGIN
    NEW.upd_dt := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_box_type_upd ON tb_box_type;
CREATE TRIGGER tg_box_type_upd
    BEFORE UPDATE ON tb_box_type
    FOR EACH ROW EXECUTE FUNCTION fn_set_upd_dt();

COMMIT;
