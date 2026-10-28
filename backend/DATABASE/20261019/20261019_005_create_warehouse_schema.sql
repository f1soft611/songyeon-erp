-- 20261019_005_create_warehouse_schema.sql
-- 대상 DB: songyeon (PostgreSQL)
-- 목적: 창고마스터 tb_warehouse (공통관리 > 기초정보 > 창고등록, 화면ID BSWarehouseView)
-- 원본: 테이블 설계자가 DB 에 직접 만든 표(2026-10-19 확인). 20260909_001 의 옛 S_ERP 모양(tenant_id · use_at …)을 대신한다.
-- 이 파일은 기록용이며 다시 돌려도 안전하다(IF NOT EXISTS). 표가 이미 있으면 아무것도 바꾸지 않는다.
--   - 표 정의(칸 · 형 · 기본값 · 제약 · 인덱스 · 설명)는 2026-10-19 DB 카탈로그에서 읽은 그대로다.
--   - 자료(설계자가 넣은 10줄)는 기록하지 않는다. 옛 warehouses 표의 6줄은 옮기지 않는다(2026-10-19 사용자 결정).
-- 운영 규칙: 사업장 F001 · 사업부 P001 고정, 창고코드는 서버가 WH001 … 로 매김(tb_id_sequence 키 WAREHOUSE_CODE · F001 · P001),
--           입고창고 = 사용 중인 원자재 기본창고(warehouse_type = '원자재' AND default_yn = 'Y'), 삭제는 use_yn = 'N'.

BEGIN;

CREATE TABLE IF NOT EXISTS tb_warehouse (
    warehouse_id        BIGSERIAL      NOT NULL,
    factory_code        VARCHAR(10)    NOT NULL,
    plant_code          VARCHAR(10)    NOT NULL,
    warehouse_cd        VARCHAR(20)    NOT NULL,
    warehouse_nm        VARCHAR(100)   NOT NULL,
    upper_warehouse_cd  VARCHAR(20),
    warehouse_type      VARCHAR(20)    NOT NULL,
    warehouse_div       VARCHAR(10)    NOT NULL DEFAULT '자가',
    temp_zone_type      VARCHAR(10)    NOT NULL DEFAULT '상온',
    temp_min            NUMERIC(6,2),
    temp_max            NUMERIC(6,2),
    humidity_min        NUMERIC(6,2),
    humidity_max        NUMERIC(6,2),
    temp_monitor_yn     CHAR(1)        NOT NULL DEFAULT 'N',
    ccp_cd              VARCHAR(20),
    stock_avail_yn      CHAR(1)        NOT NULL DEFAULT 'Y',
    hold_yn             CHAR(1)        NOT NULL DEFAULT 'N',
    minus_stock_yn      CHAR(1)        NOT NULL DEFAULT 'N',
    location_use_yn     CHAR(1)        NOT NULL DEFAULT 'N',
    lot_manage_yn       CHAR(1)        NOT NULL DEFAULT 'Y',
    default_yn          CHAR(1)        NOT NULL DEFAULT 'N',
    partner_cd          VARCHAR(20),
    manager_nm          VARCHAR(50),
    tel_no              VARCHAR(20),
    zip_cd              VARCHAR(10),
    addr1               VARCHAR(200),
    addr2               VARCHAR(200),
    area_size           NUMERIC(12,2),
    barcode_prefix      VARCHAR(10),
    sort_seq            INTEGER        DEFAULT 0,
    remark              VARCHAR(500),
    use_yn              CHAR(1)        NOT NULL DEFAULT 'Y',
    reg_dt              TIMESTAMP      NOT NULL DEFAULT NOW(),
    reg_user_id         VARCHAR(20),
    upd_dt              TIMESTAMP,
    upd_user_id         VARCHAR(20),
    CONSTRAINT pk_warehouse PRIMARY KEY (warehouse_id),
    CONSTRAINT uq_warehouse UNIQUE (warehouse_cd),
    CONSTRAINT fk_wh_upper FOREIGN KEY (upper_warehouse_cd) REFERENCES tb_warehouse (warehouse_cd),
    CONSTRAINT ck_wh_type CHECK (warehouse_type IN ('원자재', '부자재', '재공', '완제품', '반품', '보류', '폐기', '외부')),
    CONSTRAINT ck_wh_div CHECK (warehouse_div IN ('자가', '외부')),
    CONSTRAINT ck_wh_temp_zone CHECK (temp_zone_type IN ('상온', '냉장', '냉동', '해동', '가온')),
    CONSTRAINT ck_wh_temp_range CHECK (temp_min IS NULL OR temp_max IS NULL OR temp_max >= temp_min),
    CONSTRAINT ck_wh_humi_range CHECK (humidity_min IS NULL OR humidity_max IS NULL OR humidity_max >= humidity_min),
    CONSTRAINT ck_wh_monitor CHECK (temp_monitor_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_avail CHECK (stock_avail_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_hold CHECK (hold_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_minus CHECK (minus_stock_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_loc_use CHECK (location_use_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_lot CHECK (lot_manage_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_default CHECK (default_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_use CHECK (use_yn IN ('Y', 'N')),
    CONSTRAINT ck_wh_hold_not_avail CHECK (NOT (hold_yn = 'Y' AND stock_avail_yn = 'Y')),
    CONSTRAINT ck_wh_outside_partner CHECK (warehouse_div = '자가' OR partner_cd IS NOT NULL),
    CONSTRAINT ck_wh_cold_temp CHECK (temp_zone_type NOT IN ('냉장', '냉동') OR (temp_min IS NOT NULL AND temp_max IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS ix_wh_site    ON tb_warehouse (factory_code, plant_code);
CREATE INDEX IF NOT EXISTS ix_wh_type    ON tb_warehouse (warehouse_type, use_yn);
CREATE INDEX IF NOT EXISTS ix_wh_temp    ON tb_warehouse (temp_zone_type);
CREATE INDEX IF NOT EXISTS ix_wh_upper   ON tb_warehouse (upper_warehouse_cd);
CREATE INDEX IF NOT EXISTS ix_wh_partner ON tb_warehouse (partner_cd);
-- 기본창고는 사업장 · 사업부 · 유형마다 사용 중인 것 한 곳
CREATE UNIQUE INDEX IF NOT EXISTS ux_wh_default ON tb_warehouse (factory_code, plant_code, warehouse_type)
    WHERE default_yn = 'Y' AND use_yn = 'Y';

COMMENT ON TABLE  tb_warehouse                    IS '창고마스터 - 원부자재/재공/완제품 보관창고 및 온도대·보류구분 관리(HACCP 보관기준)';
COMMENT ON COLUMN tb_warehouse.warehouse_id       IS '일련번호(PK, 자동채번, 서로게이트키)';
COMMENT ON COLUMN tb_warehouse.factory_code       IS '사업장코드';
COMMENT ON COLUMN tb_warehouse.plant_code         IS '사업부코드';
COMMENT ON COLUMN tb_warehouse.warehouse_cd       IS '창고코드 [UNIQUE, 타 테이블 참조 자연키]';
COMMENT ON COLUMN tb_warehouse.warehouse_nm       IS '창고명';
COMMENT ON COLUMN tb_warehouse.upper_warehouse_cd IS '상위창고코드(자기참조, 건물/동 단위 계층)';
COMMENT ON COLUMN tb_warehouse.warehouse_type     IS '창고유형(원자재/부자재/재공/완제품/반품/보류/폐기/외부)';
COMMENT ON COLUMN tb_warehouse.warehouse_div      IS '창고구분(자가/외부)';
COMMENT ON COLUMN tb_warehouse.temp_zone_type     IS '온도대구분(상온/냉장/냉동/해동/가온)';
COMMENT ON COLUMN tb_warehouse.temp_min           IS '관리 하한온도(℃) - 냉장/냉동 필수';
COMMENT ON COLUMN tb_warehouse.temp_max           IS '관리 상한온도(℃) - 냉장/냉동 필수';
COMMENT ON COLUMN tb_warehouse.humidity_min       IS '관리 하한습도(%)';
COMMENT ON COLUMN tb_warehouse.humidity_max       IS '관리 상한습도(%)';
COMMENT ON COLUMN tb_warehouse.temp_monitor_yn    IS '온도 자동모니터링 대상여부(Y/N) - 센서 연동';
COMMENT ON COLUMN tb_warehouse.ccp_cd             IS '연계 CCP코드(보관온도 CCP 관리 대상)';
COMMENT ON COLUMN tb_warehouse.stock_avail_yn     IS '가용재고 산입여부(Y/N) - N이면 수주 가용재고에서 제외';
COMMENT ON COLUMN tb_warehouse.hold_yn            IS '보류(격리)창고 여부(Y/N) - 부적합품 격리보관';
COMMENT ON COLUMN tb_warehouse.minus_stock_yn     IS '음수재고 허용여부(Y/N)';
COMMENT ON COLUMN tb_warehouse.location_use_yn    IS '로케이션 관리 사용여부(Y/N)';
COMMENT ON COLUMN tb_warehouse.lot_manage_yn      IS 'LOT 관리 여부(Y/N) - HACCP 추적성';
COMMENT ON COLUMN tb_warehouse.default_yn         IS '기본창고 여부(Y/N) - 유형별 사업장당 1개';
COMMENT ON COLUMN tb_warehouse.partner_cd         IS '외부창고 운영 거래처코드(FK, 외부창고 필수)';
COMMENT ON COLUMN tb_warehouse.manager_nm         IS '창고 담당자명';
COMMENT ON COLUMN tb_warehouse.tel_no             IS '연락처';
COMMENT ON COLUMN tb_warehouse.zip_cd             IS '우편번호';
COMMENT ON COLUMN tb_warehouse.addr1              IS '주소';
COMMENT ON COLUMN tb_warehouse.addr2              IS '상세주소';
COMMENT ON COLUMN tb_warehouse.area_size          IS '면적(㎡)';
COMMENT ON COLUMN tb_warehouse.barcode_prefix     IS '로케이션 바코드 접두어';
COMMENT ON COLUMN tb_warehouse.sort_seq           IS '정렬순서';
COMMENT ON COLUMN tb_warehouse.remark             IS '비고';
COMMENT ON COLUMN tb_warehouse.use_yn             IS '사용여부(Y/N)';
COMMENT ON COLUMN tb_warehouse.reg_dt             IS '등록일시';
COMMENT ON COLUMN tb_warehouse.reg_user_id        IS '등록자ID';
COMMENT ON COLUMN tb_warehouse.upd_dt             IS '수정일시';
COMMENT ON COLUMN tb_warehouse.upd_user_id        IS '수정자ID';

COMMIT;
